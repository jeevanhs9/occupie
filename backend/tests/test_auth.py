from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import RestaurantMembership, User


def register(client, *, name='Test Guest', email='test@example.com', password='a-secure-test-password', role=None):
    data = {'name': name, 'email': email, 'password': password}
    if role is not None:
        data['role'] = role
    return client.post('/api/auth/register', json=data)


def test_register_creates_unverified_customer_and_ignores_submitted_role(client, app, monkeypatch):
    sent = {}
    monkeypatch.setattr('app.routes.auth._send_token', lambda user, purpose, token: sent.update(token=token, purpose=purpose) or False)
    response = register(client, role='manager')

    assert response.status_code == 201
    assert response.get_json()['verificationEmailSent'] is False
    assert sent['purpose'] == 'verify'
    user = User.query.filter_by(email='test@example.com').one()
    assert user.role == 'customer'
    assert user.email_verified_at is None
    assert user.verification_token_hash
    assert client.post('/api/auth/verify', json={'token': sent['token']}).status_code == 200
    assert User.query.filter_by(email='test@example.com').one().email_verified_at


def test_register_rejects_invalid_email_and_short_password(client):
    assert register(client, email='not-an-email').status_code == 422
    assert register(client, email='new@example.com', password='short').status_code == 422


def test_duplicate_registration_is_rejected(client):
    assert register(client).status_code == 201
    assert register(client).status_code == 409


def test_login_requires_verified_email_and_sets_http_only_cookies(client, app):
    register(client)
    rejected = client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'a-secure-test-password'})
    assert rejected.status_code == 403
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').one()
        user.email_verified_at = datetime.now(timezone.utc)
        db.session.commit()

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


def test_password_reset_uses_expiring_one_time_token(client, app, monkeypatch):
    register(client)
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').one()
        user.email_verified_at = datetime.now(timezone.utc)
        db.session.commit()
    sent = {}
    monkeypatch.setattr('app.routes.auth._send_token', lambda user, purpose, token: sent.update(token=token, purpose=purpose) or False)

    assert client.post('/api/auth/forgot-password', json={'email': 'test@example.com'}).status_code == 200
    reset = client.post('/api/auth/reset-password', json={'token': sent['token'], 'password': 'another-secure-password'})
    assert reset.status_code == 200
    assert client.post('/api/auth/reset-password', json={'token': sent['token'], 'password': 'third-secure-password'}).status_code == 400
    assert client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'another-secure-password'}).status_code == 200


def test_expired_verification_token_is_rejected(client, app, monkeypatch):
    sent = {}
    monkeypatch.setattr('app.routes.auth._send_token', lambda user, purpose, token: sent.update(token=token, purpose=purpose) or False)
    register(client)
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').one()
        user.verification_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.session.commit()
    assert client.post('/api/auth/verify', json={'token': sent['token']}).status_code == 400


def test_customer_cannot_access_staff_mutations(customer_client):
    response = customer_client.post('/api/v1/tables', json={
        'id': 'T99', 'name': 'Unauthorized', 'capacity': 4,
    })
    assert response.status_code == 403


def test_staff_role_is_membership_backed(manager_client, app):
    with app.app_context():
        membership = RestaurantMembership.query.filter_by(restaurant_id='default').one()
        assert membership.role == 'manager'
