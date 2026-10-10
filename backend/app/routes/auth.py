import re
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    decode_token,
    get_current_user,
    set_access_cookies,
    unset_access_cookies,
)
from sqlalchemy.exc import IntegrityError

from app.extensions import db, limiter
from app.middleware.auth import jwt_authenticated
from app.models import Restaurant, RestaurantMembership, RevokedToken, User

auth_bp = Blueprint('auth', __name__)
EMAIL_PATTERN = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def _json_body():
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def _profile(user):
    restaurant_id = current_app.config.get('DEFAULT_RESTAURANT_ID', 'default')
    membership = RestaurantMembership.query.filter_by(
        user_id=user.id, restaurant_id=restaurant_id
    ).first()
    return {
        **user.to_dict(),
        'role': membership.role if membership else 'customer',
        'restaurantId': membership.restaurant_id if membership else restaurant_id,
    }


def _issue_access_cookie(user):
    # Keep the existing short-lived, HTTP-only JWT cookie design. Roles are
    # resolved from trusted restaurant membership data in _profile().
    access = create_access_token(
        identity=str(user.id),
        additional_claims={'auth_version': user.auth_version},
    )
    response = jsonify({'user': _profile(user)})
    set_access_cookies(response, access)
    return response


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5 per hour')
def register():
    data = _json_body()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
        return jsonify(message='Name is required and must be 120 characters or fewer.'), 422
    if (
        not isinstance(email, str)
        or len(email.strip()) > 120
        or not EMAIL_PATTERN.fullmatch(email.strip())
    ):
        return jsonify(message='Enter a valid email address.'), 422
    if not isinstance(password, str) or len(password) < 12 or len(password) > 128:
        return jsonify(message='Password must be between 12 and 128 characters long.'), 422

    normalized_email = email.strip().lower()
    if User.query.filter_by(email=normalized_email).first():
        return jsonify(message='An account with this email already exists.'), 409

    # Public registration always creates a customer; staff accounts are
    # provisioned through the trusted backend CLI and membership table.
    user = User(name=name.strip(), email=normalized_email, role='customer', password=password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(message='An account with this email already exists.'), 409
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Account registration failed')
        return jsonify(message='Registration could not be completed. Please try again.'), 503

    return jsonify(message='Account created. You can now sign in.'), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per 15 minutes')
def login():
    data = _json_body()
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email.strip().lower()).first() if isinstance(email, str) else None
    if not user or not isinstance(password, str) or not user.check_password(password):
        return jsonify(message='Invalid email or password.'), 401
    return _issue_access_cookie(user), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    access_cookie = current_app.config['JWT_ACCESS_COOKIE_NAME']
    access_csrf_cookie = current_app.config['JWT_ACCESS_CSRF_COOKIE_NAME']
    raw_token = request.cookies.get(access_cookie)
    claims = None
    if raw_token:
        try:
            claims = decode_token(raw_token, allow_expired=True)
        except Exception:
            claims = None

    if claims:
        csrf_header = request.headers.get('X-CSRF-TOKEN')
        csrf_cookie = request.cookies.get(access_csrf_cookie)
        if not csrf_header or csrf_header != csrf_cookie or csrf_header != claims.get('csrf'):
            return jsonify(error='Unauthorized', message='A valid CSRF token is required to sign out.'), 401
        db.session.merge(RevokedToken(
            jti=claims['jti'],
            expires_at=datetime.fromtimestamp(claims['exp'], timezone.utc),
        ))

    db.session.commit()
    response = jsonify(message='Signed out.')
    unset_access_cookies(response)
    # Clear cookies issued by the previous refresh-token flow so an old browser
    # session does not retain credentials that the server no longer accepts.
    response.delete_cookie('occupie_refresh', path='/')
    response.delete_cookie('occupie_csrf_refresh', path='/')
    return response, 200


@auth_bp.route('/me', methods=['GET'])
@jwt_authenticated
def me():
    user = get_current_user()
    if not user:
        return jsonify(message='Account not found.'), 401
    return jsonify(user=_profile(user)), 200


@auth_bp.route('/restaurants', methods=['GET'])
def list_restaurants():
    restaurants = Restaurant.query.order_by(Restaurant.name).all()
    return jsonify({'restaurants': [{'id': row.id, 'name': row.name} for row in restaurants]}), 200
