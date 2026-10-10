import pytest

from app import create_app


def test_production_app_requires_secrets_and_database_url(monkeypatch):
    for key in ('SECRET_KEY', 'JWT_SECRET_KEY', 'DATABASE_URL'):
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(RuntimeError, match='Production configuration requires'):
        create_app('production')


def test_production_app_rejects_example_secrets(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'replace-with-a-random-secret-at-least-32-characters')
    monkeypatch.setenv('JWT_SECRET_KEY', 'replace-with-a-different-random-secret-at-least-32-characters')
    monkeypatch.setenv('DATABASE_URL', 'postgresql://localhost/occupie')

    with pytest.raises(RuntimeError, match='must be at least 32 characters'):
        create_app('production')


def test_production_app_accepts_postgres_https_redis_and_smtp_configuration(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 's' * 48)
    monkeypatch.setenv('JWT_SECRET_KEY', 'j' * 48)
    monkeypatch.setenv('DATABASE_URL', 'postgresql+psycopg2://occupie:secret@localhost/occupie')
    monkeypatch.setenv('COOKIE_SECURE', 'true')
    monkeypatch.setenv('RATELIMIT_STORAGE_URI', 'redis://localhost:6379/0')
    monkeypatch.setenv('MAIL_SERVER', 'smtp.mailprovider.net')
    monkeypatch.setenv('MAIL_FROM', 'no-reply@occupie.co.uk')

    app = create_app('production')
    assert app.config['APP_ENV'] == 'production'
    assert app.config['JWT_COOKIE_SECURE'] is True
