from datetime import datetime, timedelta, timezone


def test_customer_to_floor_staff_service_workflow(
    client, manager_client, staff_client_factory,
):
    table = manager_client.post('/api/v1/tables', json={
        'id': 'T01',
        'name': 'Window Table',
        'capacity': 4,
        'section': 'Window Patio',
        'assignedServer': 'Demo Floor Staff',
    })
    assert table.status_code == 201

    registered = client.post('/api/auth/register', json={
        'name': 'Jordan Guest',
        'email': 'jordan@example.test',
        'password': 'a-secure-test-password',
    })
    assert registered.status_code == 201
    assert registered.get_json()['message'] == 'Account created. You can now sign in.'

    signed_in = client.post('/api/auth/login', json={
        'email': 'jordan@example.test',
        'password': 'a-secure-test-password',
    })
    assert signed_in.status_code == 200
    reservation_time = datetime.now(timezone.utc) + timedelta(minutes=30)
    headers = {'X-CSRF-TOKEN': client.get_cookie('occupie_csrf_access').value}
    recommendation = client.get(
        '/api/v1/allocations/recommend?party_size=3',
        headers=headers,
    )
    assert recommendation.status_code == 200
    assert recommendation.get_json()['recommendation']['id'] == 'T01'

    booked = client.post('/api/v1/reservations', json={
        'partySize': 3,
        'startsAt': reservation_time.isoformat(),
        'tableId': 'T01',
    }, headers=headers)
    assert booked.status_code == 201
    reservation = booked.get_json()['reservation']
    assert reservation['restaurantName'] == 'Test Restaurant'

    host = staff_client_factory('host')
    visible_to_host = host.get('/api/v1/reservations').get_json()['reservations']
    assert any(item['id'] == reservation['id'] for item in visible_to_host)
    seated = host.patch(
        f"/api/v1/reservations/{reservation['id']}/status",
        json={'status': 'seated'},
    )
    assert seated.status_code == 200

    floor_staff = staff_client_factory('floor_staff')
    reset = floor_staff.patch('/api/v1/tables/T01/status', json={'status': 'cleaning'})
    assert reset.status_code == 200

    manager_tables = manager_client.get('/api/v1/tables').get_json()['tables']
    manager_reservations = manager_client.get('/api/v1/reservations').get_json()['reservations']
    assert next(item for item in manager_tables if item['id'] == 'T01')['status'] == 'cleaning'
    assert next(item for item in manager_reservations if item['id'] == reservation['id'])['status'] == 'seated'
