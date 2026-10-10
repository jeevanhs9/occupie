import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import User
from app.extensions import db

auth_bp = Blueprint('auth', __name__)

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

def is_valid_password(password):
    # Min 8 chars, at least one letter, one number, and one underscore
    pattern = r"^(?=.*[A-Za-z])(?=.*\d)(?=.*_)[A-Za-z\d_]{8,}$"
    return re.match(pattern, password)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password or not is_valid_email(email):
        return jsonify(message="Invalid email or password format"), 400

    if not is_valid_password(password):
        return jsonify(message="Password must be at least 8 characters long and contain letters, numbers, and an underscore"), 400

    if User.query.filter_by(email=email).first():
        return jsonify(message="Email already registered"), 409

    new_user = User(email=email, role='customer')
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify(message="User registered successfully"), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify(
            access_token=access_token,
            user={
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
        ), 200

    # Generic error for invalid credentials
    return jsonify(message="Invalid credentials"), 401

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify(message="User not found"), 404

    return jsonify(
        id=user.id,
        email=user.email,
        role=user.role
    ), 200
