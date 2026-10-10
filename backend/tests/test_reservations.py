from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import Reservation


def create_table(manager_client, table_id='T01', capacity=4):
    return manager_client.post('/api/v1/tables', json={
        'id': table_id,
        'name': f'Table {table_id}',
        'capacity': capacity,
        'section': 'Main Dining',
    })


def create_reservation(manager_client, guest='Guest One', at=None, **extra):
    return manager_client.post('/api/v1/reservations', json={
        'guestName': guest,
        'partySize': 3,
        'startsAt': (at or datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        **extra,
    })


def test_reservation_is_assigned_to_smallest_available_capacity(manager_client):
    create_table(manager_client, 'T01', 6)
    create_table(manager_client, 'T02', 4)
    response = create_reservation(manager_client)
    assert response.status_code == 201
    assert response.get_json()['reservation']['table'] == 'T02'


def test_suggested_table_must_still_be_available_at_confirmation(manager_client):
    create_table(manager_client, 'T01', 4)
    at = datetime.now(timezone.utc) + timedelta(hours=2)
    first = create_reservation(manager_client, 'First Guest', at)
    assert first.status_code == 201

    second = create_reservation(manager_client, 'Second Guest', at, tableId='T01')
    assert second.status_code == 409


def test_late_check_in_can_be_seated_and_updates_occupancy(manager_client, app):
    create_table(manager_client, capacity=4)
    response = create_reservation(manager_client, 'Late Guest')
    reservation = response.get_json()['reservation']
    with app.app_context():
        record = db.session.get(Reservation, reservation['id'])
        record.starts_at = datetime.now(timezone.utc) - timedelta(minutes=45)
        db.session.commit()

    checked_in = manager_client.patch(
        f"/api/v1/reservations/{reservation['id']}/status",
        json={'status': 'checked_in'},
    )
    assert checked_in.status_code == 200
    seated = manager_client.patch(
        f"/api/v1/reservations/{reservation['id']}/status",
        json={'status': 'seated'},
    )
    assert seated.status_code == 200
    table = manager_client.get('/api/v1/tables').get_json()['tables'][0]
    assert table['status'] == 'occupied'
    assert table['partySize'] == 3


def test_conflicting_reservations_are_rejected(manager_client):
    create_table(manager_client, capacity=4)
    at = datetime.now(timezone.utc) + timedelta(hours=2)
    assert create_reservation(manager_client, 'First Guest', at).status_code == 201
    conflict = create_reservation(manager_client, 'Second Guest', at + timedelta(minutes=30))
    assert conflict.status_code == 409


def test_cancellation_releases_reservation_hold(manager_client):
    create_table(manager_client, capacity=4)
    at = datetime.now(timezone.utc) + timedelta(hours=2)
    created = create_reservation(manager_client, 'First Guest', at)
    reservation = created.get_json()['reservation']
    cancelled = manager_client.patch(
        f"/api/v1/reservations/{reservation['id']}/status",
        json={'status': 'cancelled'},
    )
    assert cancelled.status_code == 200
    next_booking = create_reservation(manager_client, 'Next Guest', at)
    assert next_booking.status_code == 201
