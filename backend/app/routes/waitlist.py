from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import WaitlistEntry
from app.extensions import db
from datetime import datetime

waitlist_bp = Blueprint('waitlist', __name__)

@waitlist_bp.route('/', methods=['POST'])
@jwt_required()
def add_to_waitlist():
    user_id = get_jwt_identity()
    data = request.get_json()
    new_entry = WaitlistEntry(
        restaurant_id=data['restaurant_id'],
        user_id=user_id,
        party_size=data['party_size']
    )
    db.session.add(new_entry)
    db.session.commit()
    return jsonify(id=new_entry.id, status=new_entry.status), 201

@waitlist_bp.route('/', methods=['GET'])
@jwt_required()
def list_waitlist():
    entries = WaitlistEntry.query.filter_by(status='waiting').order_by(WaitlistEntry.created_at).all()
    return jsonify([{"id": e.id, "party_size": e.party_size, "created_at": e.created_at} for e in entries]), 200

@waitlist_bp.route('/<int:id>/seat', methods=['POST'])
@jwt_required()
def seat_waitlist_entry(id):
    entry = WaitlistEntry.query.get_or_404(id)
    entry.status = 'seated'
    db.session.commit()
    return jsonify(message="Entry seated"), 200
