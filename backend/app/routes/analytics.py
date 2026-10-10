from flask import Blueprint, jsonify
from app.models import Reservation, RestaurantTable, AuditLog
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/summary', methods=['GET'])
def get_summary():
    # Example metric: total successful reservations
    total_res = Reservation.query.filter_by(status='completed').count()
    return jsonify({"total_completed_reservations": total_res}), 200

@analytics_bp.route('/utilization', methods=['GET'])
def get_utilization():
    # Simplified utilization: occupied vs total
    total_tables = RestaurantTable.query.count()
    occupied = RestaurantTable.query.filter_by(status='occupied').count()
    utilization = (occupied / total_tables * 100) if total_tables > 0 else 0
    return jsonify({"utilization_percentage": utilization}), 200
