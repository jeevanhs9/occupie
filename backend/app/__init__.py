import logging
import os
from datetime import datetime, timezone
from getpass import getpass
from flask import Flask, jsonify, request
import click

from app.extensions import db, migrate, jwt, limiter
from app.config import Config
from app import models
from app.models import Restaurant, RestaurantMembership, RevokedToken, User

def create_app(config_class=Config):
    app = Flask(__name__)
    production_requested = isinstance(config_class, str) and config_class.lower() == 'production'
    if isinstance(config_class, str):
        app.config.from_object(Config)
        app.config['APP_ENV'] = config_class.lower()
        app.config['AUTO_CREATE_SCHEMA'] = False
        if production_requested:
            app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
            app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
            app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    else:
        app.config.from_object(config_class)

    if app.config.get('APP_ENV') == 'production' or production_requested:
        required = ('SECRET_KEY', 'JWT_SECRET_KEY', 'SQLALCHEMY_DATABASE_URI')
        missing = [key for key in required if not app.config.get(key)]
        if missing:
            raise RuntimeError(f"Production configuration requires {', '.join(missing)}")
        for key in ('SECRET_KEY', 'JWT_SECRET_KEY'):
            value = app.config[key]
            if len(value) < 32 or value.startswith('change-in-production') or value in {
                'dev-secret-key-do-not-use-in-prod',
                'a-very-long-and-secure-random-secret-key-that-is-at-least-32-bytes',
            }:
                raise RuntimeError(f"{key} must be at least 32 characters and must not be an example placeholder")
        if 'sqlite:' in app.config['SQLALCHEMY_DATABASE_URI']:
            raise RuntimeError('Production configuration requires DATABASE_URL to point to PostgreSQL')
        if not app.config.get('COOKIE_SECURE'):
            raise RuntimeError('Production configuration requires COOKIE_SECURE=true')
        if app.config.get('RATELIMIT_STORAGE_URI') == 'memory://':
            raise RuntimeError('Production configuration requires shared RATELIMIT_STORAGE_URI (for example Redis)')
        if not app.config.get('MAIL_SERVER'):
            raise RuntimeError('Production configuration requires SMTP MAIL_SERVER for verification and reset email')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    @jwt.token_in_blocklist_loader
    def is_token_revoked(jwt_header, jwt_payload):
        if RevokedToken.query.filter_by(jti=jwt_payload['jti']).first():
            return True
        try:
            user = db.session.get(User, int(jwt_payload['sub']))
        except (TypeError, ValueError):
            return True
        return not user or jwt_payload.get('auth_version') != user.auth_version

    @jwt.user_lookup_loader
    def load_user(jwt_header, jwt_payload):
        try:
            return db.session.get(User, int(jwt_payload['sub']))
        except (TypeError, ValueError):
            return None

    @jwt.unauthorized_loader
    def handle_missing_jwt(reason):
        return jsonify(error='Unauthorized', message='Sign in to continue.'), 401

    @jwt.invalid_token_loader
    def handle_invalid_jwt(reason):
        return jsonify(error='Unauthorized', message='Your session is invalid or expired.'), 401

    @jwt.expired_token_loader
    def handle_expired_jwt(jwt_header, jwt_payload):
        return jsonify(error='Unauthorized', message='Your session has expired. Sign in again.'), 401

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin', '').rstrip('/')
        if origin and origin in app.config.get('FRONTEND_ORIGINS', set()):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-CSRF-TOKEN'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    # Configure logging
    if not app.debug and not app.testing:
        # In a real app we might configure file handlers here
        logging.basicConfig(level=logging.INFO)

    # Register centralization error handlers
    register_error_handlers(app)

    # Keep the original health/auth URLs working for existing local clients.
    from app.routes.health import health_bp
    app.register_blueprint(health_bp, url_prefix='/api')

    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.routes.operations import operations_bp
    app.register_blueprint(operations_bp, url_prefix='/api/v1')
    app.register_blueprint(health_bp, url_prefix='/api/v1', name='v1_health')

    if app.config.get('AUTO_CREATE_SCHEMA'):
        os.makedirs(app.instance_path, exist_ok=True)
        with app.app_context():
            db.create_all()
            if not db.session.get(Restaurant, app.config['DEFAULT_RESTAURANT_ID']):
                db.session.add(Restaurant(
                    id=app.config['DEFAULT_RESTAURANT_ID'],
                    name='Occupie Restaurant',
                ))
                db.session.commit()

    @app.cli.command('provision-staff')
    @click.option('--name', prompt=True)
    @click.option('--email', prompt=True)
    @click.option('--role', type=click.Choice(['manager', 'host', 'floor_staff']), prompt=True)
    @click.option('--restaurant-id', default=None, help='Existing restaurant ID; creates the configured default if omitted.')
    def provision_staff(name, email, role, restaurant_id):
        """Provision staff accounts from a trusted server terminal (never public signup)."""
        password = getpass('Password (12+ characters): ')
        user = User.query.filter_by(email=email.strip().lower()).first()
        if user:
            raise click.ClickException('That email address already has an account.')
        user = User(name=name, email=email, role=role, password=password)
        user.email_verified_at = datetime.now(timezone.utc)
        selected_restaurant = restaurant_id or app.config['DEFAULT_RESTAURANT_ID']
        restaurant = db.session.get(Restaurant, selected_restaurant)
        if not restaurant and not restaurant_id:
            restaurant = Restaurant(id=selected_restaurant, name='Occupie Restaurant')
            db.session.add(restaurant)
        if not restaurant and restaurant_id:
            raise click.ClickException('The requested restaurant does not exist.')
        db.session.add(user)
        db.session.flush()
        db.session.add(RestaurantMembership(user_id=user.id, restaurant_id=selected_restaurant, role=role))
        db.session.commit()
        click.echo(f'Provisioned {role} account {user.email} for {selected_restaurant}.')

    return app

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error="Bad Request", message=str(e.description)), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Not Found", message="The requested resource was not found."), 404

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal Server Error: {e}")
        return jsonify(error="Internal Server Error", message="An unexpected error occurred."), 500
