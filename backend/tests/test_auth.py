from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from flask_jwt_extended import create_access_token, decode_token
from app.extensions import db
from app.models import Restaurant, RestaurantMembership, User
from app.routes.auth import _token_hash


def register(client, *, name='Test Guest', email='test@example.com', password='a-secure-test-password', role=None):
    data = {'name': name, 'email': email, 'password': password}
    if role is not None:
        data['role'] = role
    return client.post('/api/auth/register', json=data)


def test_register_creates_verified_customer_and_ignores_submitted_role(client):
    response = register(client, role='manager')

    assert response.status_code == 201
    assert 'verificationEmailSent' not in response.get_json()
    user = User.query.filter_by(email='test@example.com').one()
    assert user.role == 'customer'
    assert user.email_verified_at is not None
    assert user.verification_token_hash is None


def test_register_rejects_invalid_email_and_short_password(client):
    assert register(client, email='not-an-email').status_code == 422
    assert register(client, email='new@example.com', password='short').status_code == 422


def test_duplicate_registration_is_rejected(client):
    assert register(client).status_code == 201
    assert register(client).status_code == 409


def test_registration_is_rate_limited(client, monkeypatch):
    monkeypatch.setattr('app.routes.auth._send_token', lambda *args: False)
    for index in range(5):
        assert register(client, email=f'limited-{index}@example.test').status_code == 201
    assert register(client, email='limited-final@example.test').status_code == 429


def test_login_works_immediately_and_sets_http_only_cookies(client):
    register(client)
    response = client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'a-secure-test-password'})
    assert response.status_code == 200
    assert 'access_token' not in response.get_json()
    cookies = response.headers.getlist('Set-Cookie')
    access = next(cookie for cookie in cookies if cookie.startswith('occupie_access='))
    assert 'HttpOnly' in access
    assert 'SameSite=Lax' in access
    assert response.get_json()['user']['role'] == 'customer'


def test_me_restores_session_from_cookie_and_logout_invalidates_it(manager_client):
    response = manager_client.get('/api/auth/me')
    assert response.status_code == 200
    assert response.get_json()['user']['role'] == 'manager'

    csrf = manager_client.get_cookie('occupie_csrf_access').value
    refresh_cookie = manager_client.get_cookie('occupie_refresh').value
    refresh_csrf = manager_client.get_cookie('occupie_csrf_refresh').value
    logged_out = manager_client.post('/api/auth/logout', headers={'X-CSRF-TOKEN': csrf})
    assert logged_out.status_code == 200
    assert manager_client.get('/api/auth/me').status_code == 401
    manager_client.set_cookie('occupie_refresh', refresh_cookie)
    manager_client.set_cookie('occupie_csrf_refresh', refresh_csrf)
    assert manager_client.post('/api/auth/refresh', headers={'X-CSRF-TOKEN': refresh_csrf}).status_code == 401


def test_logout_requires_csrf_protection(manager_client):
    manager_client.environ_base.pop('HTTP_X_CSRF_TOKEN', None)
    response = manager_client.post('/api/auth/logout')
    assert response.status_code == 401


def test_logout_still_revokes_session_when_access_cookie_has_expired(manager_client, app):
    refresh_cookie = manager_client.get_cookie('occupie_refresh').value
    refresh_csrf = manager_client.get_cookie('occupie_csrf_refresh').value
    with app.app_context():
        user = User.query.filter_by(email='manager@test.local').one()
        expired_access = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(seconds=-1),
            additional_claims={'auth_version': user.auth_version},
        )
        expired_csrf = decode_token(expired_access, allow_expired=True)['csrf']
    manager_client.set_cookie('occupie_access', expired_access)
    manager_client.set_cookie('occupie_csrf_access', expired_csrf)

    response = manager_client.post('/api/auth/logout', headers={'X-CSRF-TOKEN': expired_csrf})
    assert response.status_code == 200
    manager_client.set_cookie('occupie_refresh', refresh_cookie)
    manager_client.set_cookie('occupie_csrf_refresh', refresh_csrf)
    assert manager_client.post('/api/auth/refresh', headers={'X-CSRF-TOKEN': refresh_csrf}).status_code == 401


def test_password_reset_uses_expiring_one_time_token(client, app):
    register(client)
    forgot = client.post('/api/auth/forgot-password', json={'email': 'test@example.com'})
    assert forgot.status_code == 200
    assert forgot.get_json()['message'] == client.post(
        '/api/auth/forgot-password', json={'email': 'missing@example.com'},
    ).get_json()['message']
    token = parse_qs(urlparse(forgot.get_json()['developmentResetUrl']).query)['token'][0]
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').one()
        assert user.password_reset_token_hash == _token_hash(token)
        assert user.password_reset_token_hash != token
    reset = client.post('/api/auth/reset-password', json={'token': token, 'password': 'another-secure-password'})
    assert reset.status_code == 200
    assert client.post('/api/auth/reset-password', json={'token': token, 'password': 'third-secure-password'}).status_code == 400
    assert client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'another-secure-password'}).status_code == 200


def test_password_reset_link_is_not_returned_outside_development(client, app):
    register(client)
    old_testing = app.config['TESTING']
    app.config['APP_ENV'] = 'production'
    app.config['TESTING'] = False
    try:
        response = client.post('/api/auth/forgot-password', json={'email': 'test@example.com'})
    finally:
        app.config['APP_ENV'] = 'development'
        app.config['TESTING'] = old_testing
    assert response.status_code == 200
    assert 'developmentResetUrl' not in response.get_json()


def test_expired_verification_token_is_rejected(client, app):
    register(client)
    token = 'legacy-verification-token'
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').one()
        user.verification_token_hash = _token_hash(token)
        user.verification_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.session.commit()
    assert client.post('/api/auth/verify', json={'token': token}).status_code == 400


def test_customer_cannot_access_staff_mutations(customer_client):
    response = customer_client.post('/api/v1/tables', json={
        'id': 'T99', 'name': 'Unauthorized', 'capacity': 4,
    })
    assert response.status_code == 403


def test_unauthenticated_operations_are_rejected(client):
    assert client.get('/api/v1/tables').status_code == 401


def test_host_and_floor_staff_have_distinct_permissions(staff_client_factory):
    host = staff_client_factory('host')
    assert host.post('/api/v1/tables', json={'id': 'T01', 'name': 'Table', 'capacity': 4}).status_code == 403
    assert host.post('/api/v1/waitlist', json={'partyName': 'Walk-in', 'partySize': 2}).status_code == 201

    floor = staff_client_factory('floor_staff')
    assert floor.post('/api/v1/waitlist', json={'partyName': 'Walk-in', 'partySize': 2}).status_code == 403
    assert floor.get('/api/v1/waitlist').status_code == 200


def test_floor_staff_can_read_but_not_create_or_change_reservations(manager_client, staff_client_factory):
    table = manager_client.post('/api/v1/tables', json={
        'id': 'T01', 'name': 'Table 1', 'capacity': 4,
    })
    assert table.status_code == 201
    created = manager_client.post('/api/v1/reservations', json={
        'guestName': 'Reserved Guest',
        'partySize': 2,
        'startsAt': (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
    })
    assert created.status_code == 201
    reservation_id = created.get_json()['reservation']['id']

    floor = staff_client_factory('floor_staff')
    assert floor.get('/api/v1/reservations').status_code == 200
    assert floor.post('/api/v1/reservations', json={
        'guestName': 'Walk-in Guest',
        'partySize': 2,
        'startsAt': (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
    }).status_code == 403
    assert floor.patch(
        f'/api/v1/reservations/{reservation_id}/status',
        json={'status': 'cancelled'},
    ).status_code == 403


def test_records_are_scoped_to_selected_restaurant(manager_client, customer_client, app):
    with app.app_context():
        other_restaurant = Restaurant(id='other', name='Other Restaurant')
        db.session.add(other_restaurant)
        db.session.commit()

    assert manager_client.post('/api/v1/tables', json={
        'id': 'T01', 'name': 'Table 1', 'capacity': 4,
    }).status_code == 201
    created = manager_client.post('/api/v1/reservations', json={
        'guestName': 'Staff Guest',
        'partySize': 2,
        'startsAt': (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
    })
    assert created.status_code == 201
    reservation_id = created.get_json()['reservation']['id']

    other_tenant = {'X-Restaurant-ID': 'other'}
    assert manager_client.get('/api/v1/reservations', headers=other_tenant).get_json()['reservations'] == []
    assert manager_client.patch(
        f'/api/v1/reservations/{reservation_id}/status',
        json={'status': 'cancelled'}, headers=other_tenant,
    ).status_code == 404
    assert customer_client.get('/api/v1/reservations').get_json()['reservations'] == []


def test_customer_cannot_make_duplicate_active_booking_at_same_time(manager_client, customer_client):
    assert manager_client.post('/api/v1/tables', json={
        'id': 'T01', 'name': 'Table 1', 'capacity': 4,
    }).status_code == 201
    starts_at = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    payload = {'partySize': 2, 'startsAt': starts_at}
    assert customer_client.post('/api/v1/reservations', json=payload).status_code == 201
    duplicate = customer_client.post('/api/v1/reservations', json=payload)
    assert duplicate.status_code == 409


def test_staff_role_is_membership_backed(manager_client, app):
    with app.app_context():
        membership = RestaurantMembership.query.filter_by(restaurant_id='default').one()
        assert membership.role == 'manager'
