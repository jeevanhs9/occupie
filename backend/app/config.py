import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BASE_DIR = Path(__file__).resolve().parents[1]
    INSTANCE_DIR = BASE_DIR / 'instance'
    DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or f"sqlite:///{(INSTANCE_DIR / 'occupie_dev.db').as_posix()}"
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or secrets.token_hex(32)
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_COOKIE_SECURE = os.environ.get('COOKIE_SECURE', 'false').lower() == 'true'
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_COOKIE_SAMESITE = 'Lax'
    JWT_ACCESS_COOKIE_NAME = 'occupie_access'
    JWT_ACCESS_CSRF_COOKIE_NAME = 'occupie_csrf_access'
    JWT_ACCESS_CSRF_HEADER_NAME = 'X-CSRF-TOKEN'
    JWT_ACCESS_TOKEN_EXPIRES = 900
    APP_ENV = os.environ.get('FLASK_ENV', 'development').lower()
    AUTO_CREATE_SCHEMA = APP_ENV == 'development'
    FRONTEND_ORIGINS = {
        origin.strip().rstrip('/')
        for origin in os.environ.get('FRONTEND_ORIGINS', os.environ.get('FRONTEND_ORIGIN', 'http://localhost:5173,http://127.0.0.1:5173')).split(',')
        if origin.strip()
    }
    RATELIMIT_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_HEADERS_ENABLED = True
    DEFAULT_RESTAURANT_ID = os.environ.get('DEFAULT_RESTAURANT_ID', 'default')

class TestConfig(Config):
    TESTING = True
    AUTO_CREATE_SCHEMA = False
    # In a real environment, you'd likely use a dedicated test DB URL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL",
        "sqlite:///:memory:"  # In memory SQLite for fast initial component tests, or test PostgreSQL
    )
    # Using posgresql test DB if provided, else falls back to memory DB for tests
