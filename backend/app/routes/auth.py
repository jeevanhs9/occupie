import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from sqlalchemy.exc import IntegrityError

from app.extensions import db, limiter
from app.middleware.auth import jwt_authenticated
from app.models import Restaurant, RestaurantMembership, RevokedToken, User
from app.services.email import send_action_email

auth_bp = Blueprint('auth', __name__)
EMAIL_PATTERN = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
TOKEN_TTL = timedelta(hours=24)
RESET_TTL = timedelta(minutes=30)


def _token_hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


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
        'emailVerified': bool(user.email_verified_at),
    }


def _issue_cookies(user):
    claims = {'auth_version': user.auth_version}
    access = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh = create_refresh_token(identity=str(user.id), additional_claims=claims)
    response = jsonify({'user': _profile(user)})
    set_access_cookies(response, access)
    set_refresh_cookies(response, refresh)
    return response


def _send_token(user, purpose, token):
    base = current_app.config['FRONTEND_PUBLIC_URL']
    if purpose == 'verify':
        url = f'{base}/auth/verify?token={token}'
        subject = 'Verify your Occupie email address'
    else:
        url = f'{base}/auth/reset-password?token={token}'
        subject = 'Reset your Occupie password'
    return send_action_email(user.email, subject, url)


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5 per hour')
def register():
    data = _json_body()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
        return jsonify(message='Name is required and must be 120 characters or fewer.'), 422
    if not isinstance(email, str) or not EMAIL_PATTERN.fullmatch(email.strip()):
        return jsonify(message='Enter a valid email address.'), 422
    if not isinstance(password, str) or len(password) < 12 or len(password) > 128:
        return jsonify(message='Password must be between 12 and 128 characters long.'), 422

    normalized_email = email.strip().lower()
    if User.query.filter_by(email=normalized_email).first():
        return jsonify(message='An account with this email already exists.'), 409

    user = User(name=name.strip(), email=normalized_email, role='customer', password=password)
    # Registration is email-verification-free for the current prototype. Public
    # clients still cannot assign operational roles; staff access comes from a
    # trusted RestaurantMembership row.
    user.email_verified_at = datetime.now(timezone.utc)
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

    return jsonify({
        'message': 'Account created. You can now sign in.',
    }), 201


@auth_bp.route('/verify', methods=['POST'])
@limiter.limit('10 per hour')
def verify_email():
    token = _json_body().get('token')
    if not isinstance(token, str) or len(token) > 256:
        return jsonify(message='This verification link is invalid or expired.'), 400
    user = User.query.filter_by(verification_token_hash=_token_hash(token)).first()
    now = datetime.now(timezone.utc)
    expiry = user.verification_expires_at if user else None
    if user and expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if not user or not expiry or expiry <= now:
        return jsonify(message='This verification link is invalid or expired.'), 400
    user.email_verified_at = now
    user.verification_token_hash = None
    user.verification_expires_at = None
    db.session.commit()
    return jsonify(message='Email verified. You can now sign in.'), 200


@auth_bp.route('/resend-verification', methods=['POST'])
@limiter.limit('5 per hour')
def resend_verification():
    email = _json_body().get('email')
    if isinstance(email, str) and EMAIL_PATTERN.fullmatch(email.strip()):
        user = User.query.filter_by(email=email.strip().lower()).first()
        if user and not user.email_verified_at:
            raw_token = secrets.token_urlsafe(32)
            user.verification_token_hash = _token_hash(raw_token)
            user.verification_expires_at = datetime.now(timezone.utc) + TOKEN_TTL
            db.session.commit()
            try:
                _send_token(user, 'verify', raw_token)
            except Exception:
                current_app.logger.exception('Verification email delivery failed')
    return jsonify(
        message='If the account needs verification, instructions will be sent using configured email delivery.',
        deliveryConfigured=bool(current_app.config.get('MAIL_SERVER')),
    ), 200


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per 15 minutes')
def login():
    data = _json_body()
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email.strip().lower()).first() if isinstance(email, str) else None
    if not user or not isinstance(password, str) or not user.check_password(password):
        return jsonify(message='Invalid email or password.'), 401
    return _issue_cookies(user), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    claims = get_jwt()
    db.session.merge(RevokedToken(jti=claims['jti'], expires_at=datetime.fromtimestamp(claims['exp'], timezone.utc)))
    user = get_current_user()
    if not user:
        return jsonify(message='Account not found.'), 401
    response = _issue_cookies(user)
    db.session.commit()
    return response, 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    token_cookies = (
        (current_app.config['JWT_ACCESS_COOKIE_NAME'], current_app.config['JWT_ACCESS_CSRF_COOKIE_NAME']),
        (current_app.config['JWT_REFRESH_COOKIE_NAME'], current_app.config['JWT_REFRESH_CSRF_COOKIE_NAME']),
    )
    decoded_tokens = []
    for token_cookie, csrf_cookie in token_cookies:
        raw_token = request.cookies.get(token_cookie)
        if not raw_token:
            continue
        try:
            claims = decode_token(raw_token, allow_expired=True)
            decoded_tokens.append((claims, request.cookies.get(csrf_cookie)))
        except Exception:
            continue
    if decoded_tokens:
        request_token = request.headers.get('X-CSRF-TOKEN')
        csrf_valid = any(
            request_token and cookie_csrf and request_token == cookie_csrf == claims.get('csrf')
            for claims, cookie_csrf in decoded_tokens
        )
        if not csrf_valid:
            return jsonify(error='Unauthorized', message='A valid CSRF token is required to sign out.'), 401
        for claims, _ in decoded_tokens:
            db.session.merge(RevokedToken(
                jti=claims['jti'],
                expires_at=datetime.fromtimestamp(claims['exp'], timezone.utc),
            ))
    db.session.commit()
    response = jsonify(message='Signed out.')
    unset_jwt_cookies(response)
    return response, 200


@auth_bp.route('/me', methods=['GET'])
@jwt_authenticated
def me():
    user = get_current_user()
    if not user:
        return jsonify(message='Account not found.'), 401
    return jsonify(user=_profile(user)), 200


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit('5 per hour')
def forgot_password():
    email = _json_body().get('email')
    if not isinstance(email, str) or not EMAIL_PATTERN.fullmatch(email.strip()):
        return jsonify(message='Enter a valid email address.'), 422

    normalized_email = email.strip().lower()
    user = User.query.filter_by(email=normalized_email).first()
    development_reset_allowed = (
        current_app.testing or current_app.config.get('APP_ENV') == 'development'
    )
    mail_configured = bool(current_app.config.get('MAIL_SERVER'))
    response_body = {
        'message': 'If an account matches that address, password reset instructions are available through the configured recovery flow.',
        'deliveryConfigured': mail_configured,
    }

    if user and (mail_configured or development_reset_allowed):
        raw_token = secrets.token_urlsafe(32)
        user.password_reset_token_hash = _token_hash(raw_token)
        user.password_reset_expires_at = datetime.now(timezone.utc) + RESET_TTL
        db.session.commit()
        sent = False
        if mail_configured:
            try:
                sent = _send_token(user, 'reset', raw_token)
            except Exception:
                current_app.logger.exception('Password-reset email delivery failed')
        if not sent and development_reset_allowed:
            # This field is only included by the development/test app. A
            # production deployment never returns reset credentials.
            response_body['developmentResetUrl'] = (
                f"{current_app.config['FRONTEND_PUBLIC_URL']}/auth/reset-password?token={raw_token}"
            )
    return jsonify(response_body), 200


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit('10 per hour')
def reset_password():
    data = _json_body()
    token = data.get('token')
    password = data.get('password')
    if not isinstance(token, str) or len(token) > 256:
        return jsonify(message='This password-reset link is invalid or expired.'), 400
    if not isinstance(password, str) or len(password) < 12 or len(password) > 128:
        return jsonify(message='Password must be between 12 and 128 characters long.'), 422
    user = User.query.filter_by(password_reset_token_hash=_token_hash(token)).first()
    expiry = user.password_reset_expires_at if user else None
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if not user or not expiry or expiry <= datetime.now(timezone.utc):
        return jsonify(message='This password-reset link is invalid or expired.'), 400
    user.set_password(password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    user.auth_version += 1
    db.session.commit()
    return jsonify(message='Password updated. Sign in with your new password.'), 200


@auth_bp.route('/restaurants', methods=['GET'])
def list_restaurants():
    restaurants = Restaurant.query.order_by(Restaurant.name).all()
    return jsonify({'restaurants': [{'id': row.id, 'name': row.name} for row in restaurants]}), 200
