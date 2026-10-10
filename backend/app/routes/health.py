from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from app.extensions import db

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Check application and database health.
    """
    status = {
        "status": "ok",
        "database": "unknown"
    }

    try:
        # Check actual database connectivity
        db.session.execute(text("SELECT 1"))
        db.session.commit()
        status["database"] = "connected"
    except Exception as e:
        status["status"] = "error"
        status["database"] = f"disconnected ({str(e)})"
        current_app.logger.error(f"Database health check failed: {e}")
        return jsonify(status), 503

    return jsonify(status), 200
