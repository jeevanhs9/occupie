from datetime import datetime, timedelta, timezone
from app.models import AuditEvent, RestaurantTable
from app.extensions import db


def create_table(manager_client, table_id, capacity, status='available'):
    response = manager_client.post('/api/v1/tables', json={
        'id': table_id,
        'name': f'Table {table_id}',
        'capacity': capacity,
        'section': 'Main Dining',
        'status': status,
    })
    assert response.status_code == 201
    return response.get_json()['table']


def test_table_management_and_status_validation(manager_client):
    create_table(manager_client, 'T01', 4)

    response = manager_client.get('/api/v1/tables')
    assert response.status_code == 200
    assert response.get_json()['tables'][0]['id'] == 'T01'

    response = manager_client.patch('/api/v1/tables/T01/status', json={
        'status': 'occupied',
        'partySize': 3,
    })
    assert response.status_code == 200
    assert response.get_json()['table']['partySize'] == 3

    response = manager_client.patch('/api/v1/tables/T01/status', json={'status': 'occupied', 'partySize': 5})
    assert response.status_code == 422


def test_allocation_chooses_smallest_suitable_available_table(manager_client):
    create_table(manager_client, 'T01', 6)
    create_table(manager_client, 'T02', 4)
    create_table(manager_client, 'T03', 4)
    occupied = manager_client.patch('/api/v1/tables/T03/status', json={'status': 'occupied', 'partySize': 3})
    assert occupied.status_code == 200
    create_table(manager_client, 'T04', 2)

    response = manager_client.get('/api/v1/allocations/recommend?party_size=3')

    assert response.status_code == 200
    data = response.get_json()
    assert data['available'] is True
    assert data['recommendation']['id'] == 'T02'
    # New adaptive scoring engine returns 'adaptive_scoring' by default
    assert data['strategy'] in ('smallest_suitable_available_table', 'adaptive_scoring')


def test_allocation_does_not_suggest_table_held_for_reservation(manager_client):
    create_table(manager_client, 'T01', 4)
    starts_at = datetime.now(timezone.utc) + timedelta(minutes=45)
    response = manager_client.post('/api/v1/reservations', json={
        'guestName': 'Booked Guest',
        'partySize': 2,
        'startsAt': starts_at.isoformat(),
    })
    assert response.status_code == 201

    recommendation = manager_client.get('/api/v1/allocations/recommend?party_size=2')
    assert recommendation.status_code == 200
    assert recommendation.get_json()['available'] is False
    assert recommendation.get_json()['recommendation'] is None
    # Updated message for adaptive scoring engine
    message = recommendation.get_json()['message'].lower()
    assert 'available' in message or 'turnover' in message or 'wait' in message


def test_reservation_create_and_seat_updates_table(manager_client):
    create_table(manager_client, 'T01', 2)
    starts_at = datetime.now(timezone.utc) + timedelta(hours=3)

    response = manager_client.post('/api/v1/reservations', json={
        'guestName': 'Avery Example',
        'partySize': 2,
        'startsAt': starts_at.isoformat(),
    })
    assert response.status_code == 201
    reservation = response.get_json()['reservation']
    assert reservation['table'] == 'T01'
    assert reservation['restaurantName'] == 'Test Restaurant'

    response = manager_client.patch(f"/api/v1/reservations/{reservation['id']}/status", json={'status': 'seated'})
    assert response.status_code == 200
    assert response.get_json()['reservation']['status'] == 'seated'

    table = manager_client.get('/api/v1/tables').get_json()['tables'][0]
    assert table['status'] == 'occupied'
    assert table['partySize'] == 2


def test_waitlist_add_and_seat_persists_queue_and_table_status(manager_client):
    create_table(manager_client, 'T01', 4)
    response = manager_client.post('/api/v1/waitlist', json={
        'partyName': 'Lopez Party',
        'partySize': 3,
        'contact': '555-0100',
    })
    assert response.status_code == 201
    entry = response.get_json()['waitlistEntry']
    assert entry['quotedWait'] is None

    response = manager_client.post(f"/api/v1/waitlist/{entry['id']}/seat", json={})
    assert response.status_code == 200
    assert response.get_json()['waitlistEntry']['status'] == 'seated'
    assert response.get_json()['table']['status'] == 'occupied'
    assert manager_client.get('/api/v1/waitlist').get_json()['waitlist'] == []


def test_waitlist_seating_prioritizes_oldest_serviceable_party(manager_client):
    create_table(manager_client, 'T01', 4)
    first = manager_client.post('/api/v1/waitlist', json={'partyName': 'First Party', 'partySize': 2}).get_json()['waitlistEntry']
    second = manager_client.post('/api/v1/waitlist', json={'partyName': 'Second Party', 'partySize': 2}).get_json()['waitlistEntry']

    response = manager_client.post(f"/api/v1/waitlist/{second['id']}/seat", json={})
    assert response.status_code == 409
    assert 'First Party' in response.get_json()['message']

    response = manager_client.post(f"/api/v1/waitlist/{first['id']}/seat", json={})
    assert response.status_code == 200
    assert response.get_json()['waitlistEntry']['status'] == 'seated'


def test_invalid_walk_in_and_allocation_inputs_return_validation_errors(manager_client):
    invalid_walkin = manager_client.post('/api/v1/waitlist', json={'partyName': 'Guest', 'partySize': 0})
    assert invalid_walkin.status_code == 422
    assert invalid_walkin.get_json()['error'] == 'Validation Error'

    invalid_recommendation = manager_client.get('/api/v1/allocations/recommend?party_size=0')
    assert invalid_recommendation.status_code == 422


def test_operational_changes_record_actor_and_timestamps(manager_client, app):
    create_table(manager_client, 'T01', 4)
    starts_at = datetime.now(timezone.utc) + timedelta(hours=2)
    reservation = manager_client.post('/api/v1/reservations', json={
        'guestName': 'Audit Guest', 'partySize': 2, 'startsAt': starts_at.isoformat(),
    }).get_json()['reservation']
    manager_client.patch(f"/api/v1/reservations/{reservation['id']}/status", json={'status': 'checked_in'})

    with app.app_context():
        table = db.session.get(RestaurantTable, 'T01')
        events = AuditEvent.query.order_by(AuditEvent.id).all()
        assert table.created_at is not None
        assert table.updated_at is not None
        assert [event.action for event in events] == [
            'table.created', 'reservation.created', 'reservation.status_changed',
        ]
        assert all(event.actor_user_id is not None for event in events)
