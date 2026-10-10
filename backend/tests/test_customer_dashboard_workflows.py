from datetime import datetime, timedelta, timezone
from app.extensions import db
from app.models import User


def test_customer_can_create_list_check_in_and_cancel_own_reservation(
    manager_client, customer_client,
):
    table = manager_client.post('/api/v1/tables', json={
        'id': 'T01', 'name': 'Window Table', 'capacity': 4,
    })
    assert table.status_code == 201

    created = customer_client.post('/api/v1/reservations', json={
        'partySize': 2,
        'startsAt': (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        'guestName': 'A name supplied by the browser',
    })
    assert created.status_code == 201
    reservation = created.get_json()['reservation']
    assert reservation['guestName'] == 'Test Customer'
    assert reservation['startsAt'].endswith('Z')
    assert [item['id'] for item in customer_client.get('/api/v1/reservations').get_json()['reservations']] == [reservation['id']]

    checked_in = customer_client.patch(
        f"/api/v1/reservations/{reservation['id']}/status",
        json={'status': 'checked_in'},
    )
    assert checked_in.status_code == 200
    assert checked_in.get_json()['reservation']['status'] == 'checked_in'

    cancelled = customer_client.patch(
        f"/api/v1/reservations/{reservation['id']}/status",
        json={'status': 'cancelled'},
    )
    assert cancelled.status_code == 200
    assert cancelled.get_json()['reservation']['status'] == 'cancelled'


def test_customer_waitlist_is_private_ordered_and_cancellable(
    manager_client, customer_client, app,
):
    staff_entry = manager_client.post('/api/v1/waitlist', json={
        'partyName': 'Private staff guest', 'partySize': 2,
    })
    assert staff_entry.status_code == 201

    joined = customer_client.post('/api/v1/waitlist', json={
        'partyName': 'Forged name', 'partySize': 3,
    })
    assert joined.status_code == 201
    entry = joined.get_json()['waitlistEntry']
    assert entry['partyName'] == 'Test Customer'
    assert entry['position'] == 2
    assert entry['quotedWait'] is None

    own_entries = customer_client.get('/api/v1/waitlist').get_json()['waitlist']
    assert [item['id'] for item in own_entries] == [entry['id']]
    assert own_entries[0]['position'] == 2

    duplicate = customer_client.post('/api/v1/waitlist', json={'partySize': 3})
    assert duplicate.status_code == 409

    with app.app_context():
        other = User(name='Another Customer', email='another-customer@test.local', password='a-secure-test-password')
        other.email_verified_at = datetime.now(timezone.utc)
        db.session.add(other)
        db.session.commit()
    another_customer = app.test_client()
    assert another_customer.post('/api/auth/login', json={
        'email': 'another-customer@test.local', 'password': 'a-secure-test-password',
    }).status_code == 200
    csrf = another_customer.get_cookie('occupie_csrf_access')
    another_customer.environ_base['HTTP_X_CSRF_TOKEN'] = csrf.value
    assert another_customer.patch(
        f"/api/v1/waitlist/{entry['id']}", json={'status': 'cancelled'},
    ).status_code == 403
    assert customer_client.post(f"/api/v1/waitlist/{entry['id']}/seat", json={}).status_code == 403

    cancelled = customer_client.patch(
        f"/api/v1/waitlist/{entry['id']}", json={'status': 'cancelled'},
    )
    assert cancelled.status_code == 200
    assert cancelled.get_json()['waitlistEntry']['status'] == 'cancelled'
    assert customer_client.get('/api/v1/waitlist').get_json()['waitlist'] == []
