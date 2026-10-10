import pytest

from app import create_app


def test_production_app_requires_secrets_and_database_url(monkeypatch):
    for key in ('SECRET_KEY', 'JWT_SECRET_KEY', 'DATABASE_URL'):
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(RuntimeError, match='Production configuration requires'):
        create_app('production')


def test_production_app_rejects_short_example_secrets(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'change-in-production-use-a-strong-random-key')
    monkeypatch.setenv('JWT_SECRET_KEY', 'change-in-production-use-a-strong-jwt-key')
    monkeypatch.setenv('DATABASE_URL', 'postgresql://localhost/occupie')

    with pytest.raises(RuntimeError, match='must be at least 32 characters'):
        create_app('production')
