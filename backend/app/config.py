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
    
    # Database Configuration
    # Vercel Postgres provides POSTGRES_URL, standard apps use DATABASE_URL
    DATABASE_URL = (
        os.environ.get("DATABASE_URL") or 
        os.environ.get("POSTGRES_URL") or 
        ""
    ).strip()
    
    # Fix postgres:// to postgresql:// for SQLAlchemy 1.4+
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or f"sqlite:///{(INSTANCE_DIR / 'occupie_dev.db').as_posix()}"
    
    # Connection pooling for production
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 300,
        'pool_pre_ping': True,
    } if DATABASE_URL else {}
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or secrets.token_hex(32)
    JWT_TOKEN_LOCATION = ['cookies']
    
    # Cookie security settings
    APP_ENV = os.environ.get('APP_ENV') or os.environ.get('FLASK_ENV', 'development').lower()
    IS_PRODUCTION = APP_ENV == 'production'
    
    JWT_COOKIE_SECURE = IS_PRODUCTION or os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    JWT_COOKIE_CSRF_PROTECT = True
    # Use 'None' for cross-origin in production (Vercel), 'Lax' for local dev
    JWT_COOKIE_SAMESITE = 'None' if IS_PRODUCTION else 'Lax'
    JWT_ACCESS_COOKIE_NAME = 'occupie_access'
    JWT_ACCESS_CSRF_COOKIE_NAME = 'occupie_csrf_access'
    JWT_ACCESS_CSRF_HEADER_NAME = 'X-CSRF-TOKEN'
    JWT_ACCESS_TOKEN_EXPIRES = 900  # 15 minutes
    
    # Schema management
    # The database schema is managed by Alembic. Creating it while importing
    # the app can make `flask db upgrade` fail when a later revision creates
    # tables that `db.create_all()` already added.
    AUTO_CREATE_SCHEMA = False
    
    # CORS Configuration
    # In production, automatically allow the Vercel frontend origin
    FRONTEND_ORIGINS = {
        origin.strip().rstrip('/')
        for origin in os.environ.get(
            'CORS_ALLOWED_ORIGINS',
            os.environ.get('FRONTEND_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
        ).split(',')
        if origin.strip()
    }
    
    # Rate Limiting
    # Use Vercel KV or Upstash Redis in production, memory for development
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL') or os.environ.get('RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_HEADERS_ENABLED = True
    
    # Restaurant Configuration
    DEFAULT_RESTAURANT_ID = os.environ.get('DEFAULT_RESTAURANT_ID', 'default')
    DEFAULT_RESTAURANT_NAME = os.environ.get('DEFAULT_RESTAURANT_NAME', 'Occupie Demo Restaurant')
    DEFAULT_TURN_TIME_MINUTES = int(os.environ.get('DEFAULT_TURN_TIME_MINUTES', '75'))
    DEFAULT_RESERVATION_WINDOW_MINUTES = int(os.environ.get('DEFAULT_RESERVATION_WINDOW_MINUTES', '90'))
    GRACE_PERIOD_MINUTES = int(os.environ.get('GRACE_PERIOD_MINUTES', '15'))

class TestConfig(Config):
    TESTING = True
    AUTO_CREATE_SCHEMA = False
    # In a real environment, you'd likely use a dedicated test DB URL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL",
        "sqlite:///:memory:"  # In memory SQLite for fast initial component tests, or test PostgreSQL
    )
    # Using posgresql test DB if provided, else falls back to memory DB for tests
