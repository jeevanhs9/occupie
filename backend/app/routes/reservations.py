from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Reservation
from app.extensions import db
from datetime import datetime, timedelta
from app.services.allocation import is_table_available

reservations_bp = Blueprint('reservations', __name__)

@reservations_bp.route('/', methods=['POST'])
@jwt_required()
def create_reservation():
    user_id = get_jwt_identity()
    data = request.get_json()

    if data['party_size'] <= 0:
        return jsonify(message="Party size must be positive"), 400

    start_time = datetime.fromisoformat(data['start_time'])
    end_time = datetime.fromisoformat(data['end_time'])
    table_id = data.get('table_id')

    # Concurrency Protection: Lock the table row first, then check conflicts
    if table_id:
        # Lock the table row to serialize access
        from app.models import RestaurantTable
        table = db.session.query(RestaurantTable).with_for_update().get(table_id)
        if not table:
            return jsonify(message="Table not found"), 404

        overlapping = Reservation.query.filter(
            Reservation.table_id == table_id,
            Reservation.start_time < end_time,
            Reservation.end_time > start_time,
            Reservation.status.in_(['confirmed', 'seated'])
        ).with_for_update().first()

        if overlapping:
            db.session.rollback()
            return jsonify(message="Table already booked for this time"), 409

    new_res = Reservation(
        restaurant_id=data['restaurant_id'],
        user_id=user_id,
        table_id=table_id,
        party_size=data['party_size'],
        start_time=start_time,
        end_time=end_time
    )
    db.session.add(new_res)
    db.session.commit()
    return jsonify(id=new_res.id, status=new_res.status), 201

@reservations_bp.route('/', methods=['GET'])
@jwt_required()
def list_reservations():
    reservations = Reservation.query.all()
    return jsonify([{"id": r.id, "party_size": r.party_size, "status": r.status} for r in reservations]), 200
