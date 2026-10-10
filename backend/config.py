import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')


class BaseConfig:
    """Base application configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'occupie-dev-secret-key-change-in-prod'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'occupie-jwt-secret-key-change-in-prod'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_ORIGIN = os.environ.get('FRONTEND_ORIGIN', 'http://localhost:5173')
    JSON_SORT_KEYS = False


class DevelopmentConfig(BaseConfig):
    """Development configuration using local PostgreSQL or fallback."""
    DEBUG = True
    TESTING = False

    # Reads PostgreSQL DATABASE_URL from environment with safe local fallback
    raw_db_url = os.environ.get('DATABASE_URL')
    if raw_db_url:
        # SQLAlchemy 1.4+ compatibility for postgres:// vs postgresql://
        if raw_db_url.startswith('postgres://'):
            raw_db_url = raw_db_url.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = raw_db_url
    else:
        # Fallback to local SQLite instance for standalone development if PostgreSQL is unconfigured
        instance_path = BASE_DIR / 'instance'
        instance_path.mkdir(exist_ok=True)
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{instance_path / 'occupie_dev.db'}"


class TestingConfig(BaseConfig):
    """Testing configuration with SQLite in-memory database."""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


class ProductionConfig(BaseConfig):
    """Production configuration requiring environment secrets."""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
