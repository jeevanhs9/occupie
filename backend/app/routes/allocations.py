from flask import Blueprint, request, jsonify
from app.services.allocation import recommend_table
from datetime import datetime

allocations_bp = Blueprint('allocations', __name__)

@allocations_bp.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    recommendation = recommend_table(
        data['party_size'],
        datetime.fromisoformat(data['start_time']),
        data['duration_minutes']
    )
    if recommendation:
        return jsonify(recommendation), 200
    return jsonify(message="No suitable table found"), 404
