from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from app.extensions import db
from app import create_app
from app.config import TestConfig
from app.models import Restaurant, RestaurantMembership, RestaurantTable, Reservation, User


def make_table(client, table_id, capacity=4, assigned_server=None):
    response = client.post('/api/v1/tables', json={
        'id': table_id,
        'name': f'Table {table_id}',
        'capacity': capacity,
        'section': 'Main Dining',
        **({'assignedServer': assigned_server} if assigned_server else {}),
    })
    assert response.status_code == 201
    return response.get_json()['table']


def make_reservation(client, table_id='T01', starts_at=None, guest='Test Guest'):
    return client.post('/api/v1/reservations', json={
        'guestName': guest,
        'partySize': 2,
        'startsAt': (starts_at or datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
        'tableId': table_id,
    })


def test_no_match_explains_capacity_and_supported_next_actions(manager_client):
    make_table(manager_client, 'T01', capacity=4)
    response = manager_client.get('/api/v1/allocations/recommend?party_size=6')

    data = response.get_json()
    assert response.status_code == 200
    assert data['available'] is False
    assert data['reasonCode'] == 'party_exceeds_capacity'
    assert data['nextActions'] == {
        'changePartySize': True,
        'changeDateTime': True,
        'joinWaitlist': False,
    }


def test_turn_time_and_reservation_hold_are_used_by_allocation(manager_client):
    make_table(manager_client, 'T01')
    target = datetime.now(timezone.utc) + timedelta(hours=2)
    booking = make_reservation(manager_client, starts_at=target)
    assert booking.status_code == 201
    saved = manager_client.patch('/api/v1/settings/allocation', json={
        'turnTimeMinutes': 60,
        'reservationHoldMinutes': 90,
    })
    assert saved.status_code == 200

    # The proposed 60-minute turn ends after the 90-minute reservation hold begins.
    requested_at = target - timedelta(minutes=75)
    response = manager_client.get(
        '/api/v1/allocations/recommend',
        query_string={'party_size': 2, 'at': requested_at.isoformat()},
    )
    assert response.get_json()['available'] is False


def test_manager_settings_reporting_simulation_and_csv_use_database_records(manager_client, customer_client):
    make_table(manager_client, 'T01', capacity=4)
    denied = customer_client.get('/api/v1/settings/allocation')
    assert denied.status_code == 403

    created = manager_client.post('/api/v1/tables/import', json={
        'csv': 'id,name,capacity,section\nT02,Window Table,2,Window Patio\n',
    })
    assert created.status_code == 201
    assert created.get_json()['imported'] == 1

    simulation = manager_client.post('/api/v1/allocations/simulate', json={
        'parties': [{'partyId': 'P1', 'partySize': 2}, {'partyId': 'P2', 'partySize': 2}],
    })
    assert simulation.status_code == 200
    assert simulation.get_json()['persisted'] is False
    assert all(item['table'] for item in simulation.get_json()['simulation'])
    assert len(manager_client.get('/api/v1/tables').get_json()['tables']) == 2

    report = manager_client.get('/api/v1/reports/shift').get_json()['report']
    assert report['tables']['total'] == 2
    assert report['tables']['byStatus']['available'] == 2
    csv_response = manager_client.get('/api/v1/reports/export.csv')
    assert csv_response.status_code == 200
    assert b'recordType,id,status' in csv_response.data
    assert b'T02' in csv_response.data


def test_completed_reservation_records_turn_and_releases_table(manager_client):
    make_table(manager_client, 'T01')
    booking = make_reservation(manager_client)
    reservation_id = booking.get_json()['reservation']['id']
    checked_in = manager_client.patch(f'/api/v1/reservations/{reservation_id}/status', json={'status': 'checked_in'})
    assert checked_in.status_code == 200
    seated = manager_client.patch(f'/api/v1/reservations/{reservation_id}/status', json={'status': 'seated'})
    assert seated.status_code == 200
    completed = manager_client.patch(f'/api/v1/reservations/{reservation_id}/status', json={'status': 'completed'})
    assert completed.status_code == 200
    assert completed.get_json()['reservation']['completedAt']
    table = manager_client.get('/api/v1/tables').get_json()['tables'][0]
    assert table['status'] == 'cleaning'
    report = manager_client.get('/api/v1/reports/shift').get_json()['report']
    assert report['reservations']['byStatus']['completed'] == 1
    assert report['completedTurnsCount'] == 1
    assert report['recordedAverageTurnMinutes'] is not None


def test_no_show_is_blocked_until_configured_grace_expires(manager_client, app):
    make_table(manager_client, 'T01')
    booking = make_reservation(manager_client)
    reservation_id = booking.get_json()['reservation']['id']
    response = manager_client.patch(f'/api/v1/reservations/{reservation_id}/status', json={'status': 'no_show'})
    assert response.status_code == 409

    with app.app_context():
        reservation = db.session.get(Reservation, reservation_id)
        reservation.starts_at = datetime.now(timezone.utc) - timedelta(minutes=16)
        db.session.commit()
    response = manager_client.patch(f'/api/v1/reservations/{reservation_id}/status', json={'status': 'no_show'})
    assert response.status_code == 200


def test_host_reassignment_waits_for_manager_approval_and_rechecks_target(manager_client, staff_client_factory):
    make_table(manager_client, 'T01')
    make_table(manager_client, 'T02')
    reservation = make_reservation(manager_client).get_json()['reservation']
    host = staff_client_factory('host')

    requested = host.post(
        f"/api/v1/reservations/{reservation['id']}/reassignment",
        json={'tableId': 'T02', 'reason': 'Seat guest closer to entrance'},
    )
    assert requested.status_code == 201
    request_id = requested.get_json()['reassignment']['id']
    assert manager_client.get('/api/v1/reassignments').get_json()['reassignments'][0]['id'] == request_id

    approved = manager_client.patch(f'/api/v1/reassignments/{request_id}/status', json={'status': 'approved'})
    assert approved.status_code == 200
    assert approved.get_json()['reservation']['table'] == 'T02'


def test_floor_staff_is_limited_to_tables_assigned_to_authenticated_account(manager_client, staff_client_factory):
    make_table(manager_client, 'T01', assigned_server='Test floor_staff')
    make_table(manager_client, 'T02', assigned_server='Another Staff Member')
    floor_staff = staff_client_factory('floor_staff')

    listed = floor_staff.get('/api/v1/tables').get_json()['tables']
    assert [table['id'] for table in listed] == ['T01']
    denied = floor_staff.patch('/api/v1/tables/T02/status', json={'status': 'cleaning'})
    assert denied.status_code == 404


def test_table_state_machine_rejects_occupied_to_available(manager_client):
    make_table(manager_client, 'T01')
    occupied = manager_client.patch('/api/v1/tables/T01/status', json={'status': 'occupied', 'partySize': 2})
    assert occupied.status_code == 200
    invalid = manager_client.patch('/api/v1/tables/T01/status', json={'status': 'available'})
    assert invalid.status_code == 409


def test_parallel_confirmation_cannot_double_book_one_table(tmp_path):
    class FileTestConfig(TestConfig):
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{(tmp_path / 'parallel-booking.sqlite').as_posix()}"

    app = create_app(FileTestConfig)
    with app.app_context():
        db.create_all()
        db.session.add(Restaurant(id='default', name='Concurrency Test'))
        manager = User(name='Concurrency Manager', email='manager@parallel.test', password='a-secure-test-password')
        db.session.add(manager)
        db.session.flush()
        db.session.add(RestaurantMembership(user_id=manager.id, restaurant_id='default', role='manager'))
        db.session.commit()

    setup = app.test_client()
    assert setup.post('/api/auth/login', json={'email': 'manager@parallel.test', 'password': 'a-secure-test-password'}).status_code == 200
    csrf = setup.get_cookie('occupie_csrf_access').value
    setup.environ_base['HTTP_X_CSRF_TOKEN'] = csrf
    assert setup.post('/api/v1/tables', json={
        'id': 'T01', 'name': 'Only Table', 'capacity': 4, 'section': 'Main Dining',
    }).status_code == 201

    barrier = Barrier(2)
    starts_at = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()

    def attempt_booking(guest_name):
        client = app.test_client()
        assert client.post('/api/auth/login', json={
            'email': 'manager@parallel.test', 'password': 'a-secure-test-password',
        }).status_code == 200
        token = client.get_cookie('occupie_csrf_access').value
        barrier.wait(timeout=5)
        response = client.post('/api/v1/reservations', json={
            'guestName': guest_name, 'partySize': 2, 'startsAt': starts_at, 'tableId': 'T01',
        }, headers={'X-CSRF-TOKEN': token})
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(attempt_booking, ('Guest One', 'Guest Two')))

    assert sorted(statuses) == [201, 409]
    with app.app_context():
        assert Reservation.query.count() == 1
        db.session.remove()
        db.drop_all()
