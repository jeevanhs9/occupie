import os
import logging
from flask import Flask, jsonify

from app.extensions import db, migrate, jwt, limiter, cors
from app.config import Config
from app import models

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    cors.init_app(app)

    # Configure logging
    if not app.debug and not app.testing:
        logging.basicConfig(level=logging.INFO)

    # Register centralization error handlers
    register_error_handlers(app)

    # Register Blueprints
    from app.routes.health import health_bp
    app.register_blueprint(health_bp, url_prefix='/api')

    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.routes.tables import tables_bp
    app.register_blueprint(tables_bp, url_prefix='/api/tables')

    from app.routes.reservations import reservations_bp
    app.register_blueprint(reservations_bp, url_prefix='/api/reservations')

    from app.routes.allocations import allocations_bp
    app.register_blueprint(allocations_bp, url_prefix='/api/allocations')

    from app.routes.waitlist import waitlist_bp
    app.register_blueprint(waitlist_bp, url_prefix='/api/waitlist')

    from app.routes.analytics import analytics_bp
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    from app.routes.simulations import simulations_bp
    app.register_blueprint(simulations_bp, url_prefix='/api/simulations')

    # Register CLI commands
    from app.commands import process_no_shows_command
    app.cli.add_command(process_no_shows_command)

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
