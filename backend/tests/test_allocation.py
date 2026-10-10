from datetime import datetime, timedelta, timezone


def create_table(manager_client, table_id, capacity, status='available'):
    return manager_client.post('/api/v1/tables', json={
        'id': table_id,
        'name': f'Table {table_id}',
        'capacity': capacity,
        'section': 'Main Dining',
        'status': status,
    })


def test_recommendation_uses_smallest_larger_table_when_no_exact_match(manager_client):
    create_table(manager_client, 'T01', 6)
    create_table(manager_client, 'T02', 4)
    response = manager_client.get('/api/v1/allocations/recommend?party_size=3')
    assert response.status_code == 200
    assert response.get_json()['recommendation']['id'] == 'T02'


def test_recommendation_protects_reservation_window(manager_client):
    create_table(manager_client, 'T01', 4)
    starts_at = datetime.now(timezone.utc) + timedelta(minutes=45)
    booking = manager_client.post('/api/v1/reservations', json={
        'guestName': 'Booked Guest',
        'partySize': 2,
        'startsAt': starts_at.isoformat(),
    })
    assert booking.status_code == 201

    response = manager_client.get('/api/v1/allocations/recommend?party_size=2')
    assert response.status_code == 200
    assert response.get_json()['available'] is False
    assert response.get_json()['recommendation'] is None


def test_invalid_party_size_returns_validation_error(manager_client):
    response = manager_client.get('/api/v1/allocations/recommend?party_size=0')
    assert response.status_code == 422
    assert response.get_json()['error'] == 'Validation Error'
