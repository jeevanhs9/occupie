import pytest
from app import create_app
from app.config import TestConfig
from app.extensions import db

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def init_database(app):
    """Fixture to pre-populate db if needed."""
    return db
