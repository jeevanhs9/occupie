import os
from flask import Flask
from config import config_by_name
from app.extensions import db, migrate, jwt, cors
from app.middleware.errors import register_error_handlers
from app.routes import api_v1_bp


def create_app(config_name=None):
    """
    Application factory pattern for Occupie API.
    Initializes Flask application, configurations, extensions, and route blueprints.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development').lower()

    app = Flask(__name__)

    # Load configuration
    config_class = config_by_name.get(config_name, config_by_name['default'])
    app.config.from_object(config_class)
    app.config['ENV_NAME'] = config_name

    if config_name == 'production':
        app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
        app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
        secret_keys = ('SECRET_KEY', 'JWT_SECRET_KEY')
        missing = [key for key in (*secret_keys, 'SQLALCHEMY_DATABASE_URI') if not app.config.get(key)]
        if missing:
            raise RuntimeError(
                'Production configuration requires environment values for: '
                + ', '.join(missing)
            )
        weak_secrets = [
            key for key in secret_keys
            if len(app.config[key]) < 32 or app.config[key].lower().startswith(('change-in-production', 'replace-with'))
        ]
        if weak_secrets:
            raise RuntimeError(
                'Production secrets must be at least 32 characters and must not be example placeholders: '
                + ', '.join(weak_secrets)
            )

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Restrict CORS to configured frontend origin
    frontend_origin = app.config.get('FRONTEND_ORIGIN', 'http://localhost:5173')
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": [frontend_origin],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Register centralized error handlers
    register_error_handlers(app)

    # Register versioned API blueprint
    app.register_blueprint(api_v1_bp)

    return app
