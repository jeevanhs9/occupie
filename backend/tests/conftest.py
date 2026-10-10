import pytest
from datetime import datetime, timezone
from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import Restaurant, RestaurantMembership, User

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()
        if not db.session.get(Restaurant, 'default'):
            db.session.add(Restaurant(id='default', name='Test Restaurant'))
            db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def manager_client(app):
    user = User(name='Test Manager', email='manager@test.local', role='manager', password='a-secure-test-password')
    user.email_verified_at = datetime.now(timezone.utc)
    db.session.add(user)
    db.session.flush()
    db.session.add(RestaurantMembership(user_id=user.id, restaurant_id='default', role='manager'))
    db.session.commit()
    client = app.test_client()
    response = client.post('/api/auth/login', json={'email': user.email, 'password': 'a-secure-test-password'})
    assert response.status_code == 200
    csrf = client.get_cookie('occupie_csrf_access')
    client.environ_base['HTTP_X_CSRF_TOKEN'] = csrf.value
    return client


@pytest.fixture
def customer_client(app):
    user = User(name='Test Customer', email='customer@test.local', password='a-secure-test-password')
    user.email_verified_at = datetime.now(timezone.utc)
    db.session.add(user)
    db.session.commit()
    client = app.test_client()
    response = client.post('/api/auth/login', json={'email': user.email, 'password': 'a-secure-test-password'})
    assert response.status_code == 200
    csrf = client.get_cookie('occupie_csrf_access')
    client.environ_base['HTTP_X_CSRF_TOKEN'] = csrf.value
    return client

@pytest.fixture
def init_database(app):
    """Fixture to pre-populate db if needed."""
    return db
