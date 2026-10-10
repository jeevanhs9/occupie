import pytest
from app import create_app
from app.extensions import db


@pytest.fixture(scope='session')
def app():
    """Create and configure a testing Flask application."""
    test_app = create_app('testing')
    return test_app


@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    with app.test_client() as test_client:
        with app.app_context():
            db.create_all()
            yield test_client
            db.session.remove()
            db.drop_all()


@pytest.fixture(scope='function')
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()
