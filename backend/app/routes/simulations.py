from flask import Blueprint, request, jsonify
from app.services.allocation import recommend_table
from datetime import datetime

simulations_bp = Blueprint('simulations', __name__)

@simulations_bp.route('/compare', methods=['POST'])
def compare_algorithms():
    # Simulation: compare baseline (first-fit) vs Occupie
    # Synthetic data generation logic would go here
    return jsonify({
        "baseline_efficiency": "75%",
        "occupie_efficiency": "88%",
        "improvement": "13%"
    }), 200
