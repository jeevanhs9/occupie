from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import RestaurantTable
from app.extensions import db

tables_bp = Blueprint('tables', __name__)

@tables_bp.route('/', methods=['GET'])
def list_tables():
    tables = RestaurantTable.query.all()
    return jsonify([{"id": t.id, "table_number": t.table_number, "capacity": t.capacity, "status": t.status} for t in tables]), 200

@tables_bp.route('/', methods=['POST'])
@jwt_required() # Assuming staff/manager auth later
def create_table():
    data = request.get_json()
    new_table = RestaurantTable(
        restaurant_id=data['restaurant_id'],
        table_number=data['table_number'],
        capacity=data['capacity']
    )
    db.session.add(new_table)
    db.session.commit()
    return jsonify(message="Table created"), 201

@tables_bp.route('/<int:id>/status', methods=['PATCH'])
@jwt_required()
def update_table_status(id):
    table = RestaurantTable.query.get_or_404(id)
    data = request.get_json()
    table.status = data['status']
    db.session.commit()
    return jsonify(message="Status updated"), 200
