import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-do-not-use-in-prod")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Get the connection string, using a fallback for development if not provided
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/occupie_db"
    )
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "a-very-long-and-secure-random-secret-key-that-is-at-least-32-bytes")
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour

class TestConfig(Config):
    TESTING = True
    # In a real environment, you'd likely use a dedicated test DB URL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL",
        "sqlite:///:memory:"  # In memory SQLite for fast initial component tests, or test PostgreSQL
    )
    # Using posgresql test DB if provided, else falls back to memory DB for tests
