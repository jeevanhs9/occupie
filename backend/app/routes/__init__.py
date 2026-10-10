from flask import Blueprint
from app.routes.health import health_bp
from app.routes.operations import operations_bp

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')
api_v1_bp.register_blueprint(health_bp)
api_v1_bp.register_blueprint(operations_bp)

__all__ = ['api_v1_bp']
