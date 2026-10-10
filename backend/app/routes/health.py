from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from app.extensions import db

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def get_health():
    """
    Application Health & Readiness Endpoint
    Returns service identifier, API version, and live database connection status.
    """
    db_status = 'not_checked'
    db_details = None

    try:
        # Check database connectivity safely
        db.session.execute(text('SELECT 1'))
        db_status = 'connected'
    except Exception as exc:
        db_status = 'disconnected'
        db_details = f"Database connectivity check failed: {str(exc).splitlines()[0]}"

    response_payload = {
        'status': 'ok' if db_status in ('connected', 'not_checked') else 'degraded',
        'service': 'occupie-api',
        'version': 'v1',
        'environment': current_app.config.get('ENV_NAME', 'development'),
        'database': {
            'status': db_status,
        },
        'endpoints': {
            'tables': '/api/v1/tables',
            'reservations': '/api/v1/reservations',
            'allocations': '/api/v1/allocations/recommend',
            'waitlist': '/api/v1/waitlist',
        },
        'planned_endpoints': {
            'auth': '/api/v1/auth',
            'analytics': '/api/v1/analytics',
        }
    }

    if db_details:
        response_payload['database']['warning'] = db_details

    status_code = 200
    return jsonify(response_payload), status_code
