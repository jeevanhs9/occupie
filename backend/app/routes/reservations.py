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
    table_ids = data.get('table_ids', [])
    if 'table_id' in data:
        table_ids.append(data['table_id'])

    # Concurrency Protection: Lock the table rows first, then check conflicts
    tables_to_book = []
    if table_ids:
        from app.models import RestaurantTable
        # Lock all requested tables
        for tid in table_ids:
            table = db.session.query(RestaurantTable).with_for_update().get(tid)
            if not table:
                return jsonify(message=f"Table {tid} not found"), 404
            tables_to_book.append(table)

            overlapping = Reservation.query.join(Reservation.tables).filter(
                RestaurantTable.id == tid,
                Reservation.start_time < end_time,
                Reservation.end_time > start_time,
                Reservation.status.in_(['confirmed', 'seated'])
            ).first()

            if overlapping:
                db.session.rollback()
                return jsonify(message=f"Table {tid} already booked for this time"), 409

    new_res = Reservation(
        restaurant_id=data['restaurant_id'],
        user_id=user_id,
        party_size=data['party_size'],
        start_time=start_time,
        end_time=end_time
    )
    # Assign the tables relationship
    new_res.tables = tables_to_book

    db.session.add(new_res)
    db.session.commit()
    return jsonify(id=new_res.id, status=new_res.status), 201

@reservations_bp.route('/', methods=['GET'])
@jwt_required()
def list_reservations():
    reservations = Reservation.query.all()
    return jsonify([{"id": r.id, "party_size": r.party_size, "status": r.status} for r in reservations]), 200
