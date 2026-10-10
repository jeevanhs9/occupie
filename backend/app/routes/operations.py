import csv
import io
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from flask import Blueprint, current_app, g, jsonify, make_response, request
from flask_jwt_extended import get_current_user, verify_jwt_in_request
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError, OperationalError

from app.extensions import db
from app.middleware.auth import roles_required
from app.models import (
    RestaurantTable,
    Reservation,
    ReservationReassignment,
    WaitlistEntry,
    Restaurant,
    RestaurantMembership,
    RestaurantSettings,
    AuditEvent,
    TABLE_STATUSES,
    RESERVATION_STATUSES,
    WAITLIST_STATUSES,
)
from app.services.allocation import is_table_available, recommend_table

operations_bp = Blueprint('operations', __name__)


@operations_bp.before_request
def require_role_and_restaurant():
    if request.method == 'OPTIONS':
        return None
    verify_jwt_in_request()
    user = get_current_user()
    if not user:
        return _error('Sign in to continue.', 401)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}
    selected_restaurant = (
        request.headers.get('X-Restaurant-ID')
        or request.args.get('restaurant_id')
        or payload.get('restaurantId')
        or current_app.config.get('DEFAULT_RESTAURANT_ID', 'default')
    )
    if not isinstance(selected_restaurant, str) or not db.session.get(Restaurant, selected_restaurant):
        return _error('Restaurant was not found.', 404)

    membership = RestaurantMembership.query.filter_by(
        user_id=user.id, restaurant_id=selected_restaurant
    ).first()
    role = membership.role if membership else 'customer'
    path = request.path.removeprefix('/api/v1')
    if path == '/settings/allocation' and request.method == 'GET':
        allowed = {'manager', 'host'}
    elif path.startswith('/settings') or path.startswith('/reports') or path.startswith('/reassignments') or path == '/allocations/simulate' or path == '/tables/import':
        allowed = {'manager'}
    elif path.startswith('/tables'):
        allowed = {'manager', 'host', 'floor_staff', 'customer'} if request.method == 'GET' else (
            {'manager'} if path == '/tables' else {'manager', 'host', 'floor_staff'}
        )
    elif path.startswith('/reservations'):
        allowed = {'manager', 'host', 'floor_staff', 'customer'} if request.method == 'GET' else (
            {'manager', 'host', 'customer'}
        )
    elif path.startswith('/waitlist'):
        if request.method == 'GET':
            allowed = {'manager', 'host', 'floor_staff', 'customer'}
        elif path == '/waitlist' or (request.method == 'PATCH' and path.count('/') == 2):
            allowed = {'manager', 'host', 'customer'}
        else:
            allowed = {'manager', 'host'}
    elif path.startswith('/allocations'):
        allowed = {'manager', 'host', 'floor_staff', 'customer'}
    else:
        allowed = set()
    if role not in allowed:
        return _error('You do not have permission to perform this operation.', 403)
    g.occupie_user = user
    g.occupie_role = role
    g.restaurant_id = selected_restaurant
    return None


def _error(message, status=400, fields=None):
    error_name = {
        400: 'Bad Request',
        404: 'Resource Not Found',
        409: 'Conflict',
        422: 'Validation Error',
    }.get(status, 'Request Failed')
    body = {
        'error': error_name,
        'message': message,
        'status_code': status,
        'service': 'occupie-api',
    }
    if fields:
        body['fields'] = fields
    return jsonify(body), status


def _payload():
    if not request.is_json:
        return None, _error('Content-Type must be application/json.')
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, _error('Request body must be a JSON object.')
    return payload, None


def _positive_integer(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _parse_datetime(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError('startsAt must be an ISO 8601 datetime.')
    try:
        parsed = datetime.fromisoformat(value.strip().replace('Z', '+00:00'))
    except ValueError as exc:
        raise ValueError('startsAt must be an ISO 8601 datetime.') from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _commit_or_conflict():
    try:
        db.session.commit()
        return None
    except IntegrityError:
        db.session.rollback()
        return _error('A record with that identifier already exists.', 409)


def _record_audit(entity_type, entity_id, action, details=None):
    db.session.add(AuditEvent(
        restaurant_id=g.restaurant_id,
        actor_user_id=g.occupie_user.id,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        details=details or {},
    ))


def _table_by_id(table_id, lock=False):
    query = RestaurantTable.query.filter_by(id=table_id, restaurant_id=g.restaurant_id)
    if lock:
        query = query.with_for_update()
    table = query.first()
    if g.occupie_role == 'floor_staff' and table and table.assigned_server != g.occupie_user.name:
        return None
    return table


def _lock_restaurant_allocation():
    """Serialize operational writes per restaurant on PostgreSQL and SQLite."""
    try:
        result = db.session.execute(
            update(Restaurant)
            .where(Restaurant.id == g.restaurant_id)
            .values(allocation_version=Restaurant.allocation_version + 1)
        )
        if result.rowcount != 1:
            db.session.rollback()
            return _error('Restaurant was not found.', 404)
        return None
    except OperationalError:
        db.session.rollback()
        return _error('Another restaurant update is in progress. Retry this action.', 409)


def _recommendation(party_size, at=None, preferred_section=None, lock_tables=False):
    recommendations = _recommendations(
        party_size, at, preferred_section, lock_tables=lock_tables,
    )
    return recommendations[0].table if recommendations else None


def _restaurant_settings():
    settings = db.session.get(RestaurantSettings, g.restaurant_id)
    if settings is not None:
        return settings
    return RestaurantSettings(
        restaurant_id=g.restaurant_id,
        turn_time_minutes=90,
        reservation_hold_minutes=90,
        grace_period_minutes=15,
        utilization_target_percent=75,
    )


def _recommendations(party_size, at=None, preferred_section=None, lock_tables=False, all_candidates=False):
    table_query = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).order_by(RestaurantTable.id)
    if lock_tables:
        table_query = table_query.with_for_update()
    tables = table_query.all()
    reservations = Reservation.query.filter_by(restaurant_id=g.restaurant_id).all()
    from app.services.adaptive_allocation import recommend_tables
    settings = _restaurant_settings()
    return recommend_tables(
        tables=tables,
        party_size=party_size,
        reservations=reservations,
        at=at or datetime.now(timezone.utc),
        preferred_section=preferred_section,
        restaurant_id=g.restaurant_id,
        return_all_candidates=all_candidates,
        reservation_hold_minutes=settings.reservation_hold_minutes,
        turn_time_minutes=settings.turn_time_minutes,
    )


def _allocation_failure(party_size, at=None):
    payload = _allocation_failure_payload(party_size)
    return jsonify(payload), 409


def _allocation_failure_payload(party_size):
    capacities = [
        row[0] for row in db.session.query(RestaurantTable.capacity).filter_by(
            restaurant_id=g.restaurant_id
        ).all()
    ]
    if not capacities:
        code = 'no_tables_configured'
        message = 'This restaurant has no tables configured yet.'
    elif party_size > max(capacities):
        code = 'party_exceeds_capacity'
        message = f'No table can seat a party of {party_size}; the largest table seats {max(capacities)}.'
    else:
        code = 'tables_unavailable'
        message = 'All tables that fit this party are occupied, unavailable, or protected for reservations at that time.'
    return {
        'error': 'Allocation Unavailable',
        'message': message,
        'status_code': 409,
        'reasonCode': code,
        'nextActions': {
            'changePartySize': True,
            'changeDateTime': True,
            'joinWaitlist': bool(capacities and party_size <= max(capacities)),
        },
    }


def _is_table_available_for_party(table, party_size, at=None, exclude_reservation_id=None):
    if table is None:
        return False
    reservations = Reservation.query.filter(
        Reservation.restaurant_id == g.restaurant_id,
        Reservation.table_id == table.id,
    ).all()
    return is_table_available(
        table,
        party_size,
        reservations=reservations,
        at=at or datetime.now(timezone.utc),
        exclude_reservation_id=exclude_reservation_id,
        reservation_hold_minutes=_restaurant_settings().reservation_hold_minutes,
        turn_time_minutes=_restaurant_settings().turn_time_minutes,
    )


@operations_bp.route('/tables', methods=['GET', 'POST'])
def tables_collection():
    if request.method == 'GET':
        table_query = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id)
        if g.occupie_role == 'floor_staff':
            table_query = table_query.filter_by(assigned_server=g.occupie_user.name)
        tables = table_query.order_by(RestaurantTable.id).all()
        if g.occupie_role == 'customer':
            rows = [{key: table.to_dict()[key] for key in ('id', 'name', 'capacity', 'section', 'status')} for table in tables]
        else:
            rows = [table.to_dict() for table in tables]
        return jsonify({'tables': rows}), 200

    payload, error = _payload()
    if error:
        return error

    table_id = payload.get('id')
    name = payload.get('name')
    capacity = payload.get('capacity')
    section = payload.get('section', 'Main Dining')
    status = payload.get('status', 'available')
    if not isinstance(table_id, str) or not table_id.strip():
        return _error('id is required and must be a non-empty string.', 422, {'id': 'Required.'})
    if len(table_id.strip()) > 32:
        return _error('id must be 32 characters or fewer.', 422, {'id': 'Too long.'})
    if not isinstance(name, str) or not name.strip():
        return _error('name is required and must be a non-empty string.', 422, {'name': 'Required.'})
    if len(name.strip()) > 80:
        return _error('name must be 80 characters or fewer.', 422, {'name': 'Too long.'})
    if not _positive_integer(capacity):
        return _error('capacity must be a positive integer.', 422, {'capacity': 'Enter a value greater than zero.'})
    if not isinstance(section, str) or not section.strip():
        return _error('section must be a non-empty string.', 422, {'section': 'Required.'})
    if len(section.strip()) > 80:
        return _error('section must be 80 characters or fewer.', 422, {'section': 'Too long.'})
    assigned_server = payload.get('assignedServer')
    if assigned_server is not None and (not isinstance(assigned_server, str) or len(assigned_server) > 120):
        return _error('assignedServer must be a string of 120 characters or fewer.', 422, {'assignedServer': 'Invalid value.'})
    if status not in TABLE_STATUSES:
        return _error(f"status must be one of: {', '.join(TABLE_STATUSES)}.", 422, {'status': 'Invalid status.'})
    if status == 'occupied':
        return _error('Create the table as available, reserved, or cleaning; use a seating action to occupy it.', 422, {'status': 'Invalid initial state.'})

    table = RestaurantTable(
        id=table_id.strip(),
        name=name.strip(),
        capacity=capacity,
        section=section.strip(),
        restaurant_id=g.restaurant_id,
        status=status,
        assigned_server=assigned_server.strip() if assigned_server else None,
    )
    db.session.add(table)
    _record_audit('table', table.id, 'table.created', {'capacity': capacity, 'section': section.strip()})
    conflict = _commit_or_conflict()
    if conflict:
        return conflict
    return jsonify({'table': table.to_dict()}), 201


@operations_bp.route('/tables/<string:table_id>/status', methods=['PATCH'])
def update_table_status(table_id):
    payload, error = _payload()
    if error:
        return error
    lock_error = _lock_restaurant_allocation()
    if lock_error:
        return lock_error
    table = _table_by_id(table_id, lock=True)
    if table is None:
        return _error('Table was not found.', 404)

    status = payload.get('status')
    if status not in TABLE_STATUSES:
        return _error(f"status must be one of: {', '.join(TABLE_STATUSES)}.", 422, {'status': 'Invalid status.'})

    if status == 'occupied':
        party_size = payload.get('partySize')
        if not _positive_integer(party_size) or party_size > table.capacity:
            return _error('partySize must be a positive integer no larger than table capacity.', 422, {'partySize': 'Must fit this table.'})
        if table.status != 'available':
            return _error('Only an available table can be marked occupied directly.', 409)
        if not _is_table_available_for_party(table, party_size):
            return _error('No suitable available table can be assigned to this party.', 409)
        table.party_size = party_size
        table.time_seated = datetime.now(timezone.utc)
    else:
        allowed_table_transitions = {
            'available': {'cleaning', 'reserved'},
            'reserved': {'available'},
            'occupied': {'cleaning'},
            'cleaning': {'available'},
        }
        if status != table.status and status not in allowed_table_transitions[table.status]:
            return _error(f'A table cannot move from {table.status} to {status}.', 409)
        table.party_size = 0
        table.time_seated = None

    previous_status = table.status
    table.status = status
    _record_audit('table', table.id, 'table.status_changed', {
        'from': previous_status, 'to': status, 'partySize': table.party_size,
    })
    db.session.commit()
    return jsonify({'table': table.to_dict()}), 200


@operations_bp.route('/reservations', methods=['GET', 'POST'])
def reservations_collection():
    if request.method == 'GET':
        query = Reservation.query.filter_by(restaurant_id=g.restaurant_id)
        if g.occupie_role == 'customer':
            query = query.filter_by(customer_id=g.occupie_user.id)
        elif g.occupie_role == 'floor_staff':
            assigned_table_ids = db.session.query(RestaurantTable.id).filter_by(
                restaurant_id=g.restaurant_id, assigned_server=g.occupie_user.name,
            )
            query = query.filter(Reservation.table_id.in_(assigned_table_ids))
        reservations = query.order_by(Reservation.starts_at, Reservation.id).all()
        return jsonify({'reservations': [reservation.to_dict() for reservation in reservations]}), 200

    payload, error = _payload()
    if error:
        return error
    guest_name = g.occupie_user.name if g.occupie_role == 'customer' else payload.get('guestName')
    party_size = payload.get('partySize')
    if not isinstance(guest_name, str) or not guest_name.strip():
        return _error('guestName is required.', 422, {'guestName': 'Required.'})
    if len(guest_name.strip()) > 120:
        return _error('guestName must be 120 characters or fewer.', 422, {'guestName': 'Too long.'})
    if not _positive_integer(party_size):
        return _error('partySize must be a positive integer.', 422, {'partySize': 'Enter a value greater than zero.'})
    try:
        starts_at = _parse_datetime(payload.get('startsAt'))
    except ValueError as exc:
        return _error(str(exc), 422, {'startsAt': str(exc)})
    if starts_at <= datetime.now(timezone.utc):
        return _error('startsAt must be a future datetime.', 422, {'startsAt': 'Choose a future time.'})

    preferred_section = payload.get('seatingPreference')
    if preferred_section is not None and (not isinstance(preferred_section, str) or len(preferred_section) > 80):
        return _error('seatingPreference must be a string of 80 characters or fewer.', 422, {'seatingPreference': 'Invalid seating preference.'})
    phone = payload.get('phone')
    notes = payload.get('notes')
    if phone is not None and (not isinstance(phone, str) or len(phone) > 40):
        return _error('phone must be a string of 40 characters or fewer.', 422, {'phone': 'Invalid value.'})
    if notes is not None and (not isinstance(notes, str) or len(notes) > 500):
        return _error('notes must be a string of 500 characters or fewer.', 422, {'notes': 'Invalid value.'})
    lock_error = _lock_restaurant_allocation()
    if lock_error:
        return lock_error
    requested_table_id = payload.get('tableId')
    customer_id = g.occupie_user.id if g.occupie_role == 'customer' else None
    if customer_id and Reservation.query.filter(
        Reservation.restaurant_id == g.restaurant_id,
        Reservation.customer_id == customer_id,
        Reservation.starts_at == starts_at,
        Reservation.status.in_(('confirmed', 'checked_in', 'seated')),
    ).first():
        return _error('You already have an active reservation at that time.', 409)
    if requested_table_id is not None and not isinstance(requested_table_id, str):
        return _error('tableId must be a table identifier string.', 422, {'tableId': 'Invalid table.'})
    if requested_table_id:
        table = _table_by_id(requested_table_id, lock=True)
        if table is None:
            return _error('Suggested table was not found.', 404)
        if table.status != 'available' or not _is_table_available_for_party(table, party_size, starts_at):
            return _error('The suggested table is no longer available for that time. Request a new recommendation.', 409)
    else:
        table = _recommendation(party_size, starts_at, preferred_section, lock_tables=True)
    if table is None:
        return _allocation_failure(party_size, starts_at)

    reservation = Reservation(
        id=f"RES-{uuid4().hex[:8].upper()}",
        restaurant_id=g.restaurant_id,
        customer_id=customer_id,
        guest_name=guest_name.strip(),
        party_size=party_size,
        starts_at=starts_at,
        table_id=table.id,
        status='confirmed',
        phone=phone.strip() if phone and phone.strip() else None,
        notes=notes.strip() if notes and notes.strip() else None,
        preferred_section=preferred_section.strip() if preferred_section and preferred_section.strip() else None,
    )
    db.session.add(reservation)
    _record_audit('reservation', reservation.id, 'reservation.created', {
        'partySize': party_size, 'tableId': table.id, 'startsAt': starts_at.isoformat(),
    })
    conflict = _commit_or_conflict()
    if conflict:
        return conflict
    return jsonify({'reservation': reservation.to_dict()}), 201


@operations_bp.route('/reservations/<string:reservation_id>/status', methods=['PATCH'])
def update_reservation_status(reservation_id):
    payload, error = _payload()
    if error:
        return error
    lock_error = _lock_restaurant_allocation()
    if lock_error:
        return lock_error
    reservation = Reservation.query.filter_by(id=reservation_id, restaurant_id=g.restaurant_id).first()
    if reservation is None:
        return _error('Reservation was not found.', 404)
    status = payload.get('status')
    if status not in RESERVATION_STATUSES:
        return _error(f"status must be one of: {', '.join(RESERVATION_STATUSES)}.", 422, {'status': 'Invalid status.'})
    allowed_transitions = {
        'confirmed': {'checked_in', 'seated', 'cancelled', 'no_show'},
        'checked_in': {'seated', 'cancelled', 'no_show'},
        'seated': {'completed'},
        'completed': set(),
        'cancelled': set(),
        'no_show': set(),
    }
    if status != reservation.status and status not in allowed_transitions[reservation.status]:
        return _error(f'A reservation cannot move from {reservation.status} to {status}.', 409)
    if g.occupie_role == 'customer' and (
        reservation.customer_id != g.occupie_user.id or status not in {'cancelled', 'checked_in'}
    ):
        return _error('Customers may only check in to or cancel their own reservation.', 403)
    if status == reservation.status:
        return jsonify({'reservation': reservation.to_dict()}), 200
    if status == 'no_show':
        starts_at = reservation.starts_at
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        grace_minutes = _restaurant_settings().grace_period_minutes
        if datetime.now(timezone.utc) < starts_at.astimezone(timezone.utc) + timedelta(minutes=grace_minutes):
            return _error(f'The {grace_minutes}-minute arrival grace period has not ended.', 409)
    previous_status = reservation.status
    if status == 'seated':
        table = _table_by_id(reservation.table_id, lock=True) if reservation.table_id else None
        if table is None or not _is_table_available_for_party(
            table,
            reservation.party_size,
            at=datetime.now(timezone.utc),
            exclude_reservation_id=reservation.id,
        ):
            return _error('The reservation table is not available for seating because it is occupied, too small, or protected for another reservation.', 409)
        previous_table_status = table.status
        table.status = 'occupied'
        table.party_size = reservation.party_size
        table.time_seated = datetime.now(timezone.utc)
        reservation.seated_at = table.time_seated
        _record_audit('table', table.id, 'table.status_changed', {
            'from': previous_table_status, 'to': 'occupied', 'partySize': table.party_size,
        })
    elif status == 'completed':
        table = _table_by_id(reservation.table_id, lock=True) if reservation.table_id else None
        if table is None or table.status != 'occupied':
            return _error('The reservation table is not currently occupied.', 409)
        reservation.completed_at = datetime.now(timezone.utc)
        table.status = 'cleaning'
        table.party_size = 0
        _record_audit('table', table.id, 'table.status_changed', {
            'from': 'occupied', 'to': 'cleaning', 'partySize': 0,
        })
    reservation.status = status
    _record_audit('reservation', reservation.id, 'reservation.status_changed', {
        'from': previous_status, 'to': status,
    })
    db.session.commit()
    return jsonify({'reservation': reservation.to_dict()}), 200


@operations_bp.route('/waitlist', methods=['GET', 'POST'])
def waitlist_collection():
    if request.method == 'GET':
        if g.occupie_role == 'customer':
            customer_entries = WaitlistEntry.query.filter(
                WaitlistEntry.restaurant_id == g.restaurant_id,
                WaitlistEntry.created_by_id == g.occupie_user.id,
                WaitlistEntry.status.in_(('waiting', 'ready')),
            ).order_by(WaitlistEntry.created_at, WaitlistEntry.id).all()
            customer_rows = []
            for entry in customer_entries:
                position = WaitlistEntry.query.filter(
                    WaitlistEntry.restaurant_id == g.restaurant_id,
                    WaitlistEntry.status.in_(('waiting', 'ready')),
                    (WaitlistEntry.created_at < entry.created_at)
                    | ((WaitlistEntry.created_at == entry.created_at) & (WaitlistEntry.id <= entry.id)),
                ).count()
                customer_rows.append(entry.to_dict(position=position))
            return jsonify({'waitlist': customer_rows}), 200
        entries = WaitlistEntry.query.filter(
            WaitlistEntry.restaurant_id == g.restaurant_id,
            WaitlistEntry.status.in_(('waiting', 'ready')),
        ).order_by(WaitlistEntry.created_at, WaitlistEntry.id).all()
        return jsonify({'waitlist': [entry.to_dict() for entry in entries]}), 200

    payload, error = _payload()
    if error:
        return error
    party_name = payload.get('partyName')
    party_size = payload.get('partySize')
    if g.occupie_role == 'customer':
        party_name = g.occupie_user.name
    if not isinstance(party_name, str) or not party_name.strip():
        return _error('partyName is required.', 422, {'partyName': 'Required.'})
    if len(party_name.strip()) > 120:
        return _error('partyName must be 120 characters or fewer.', 422, {'partyName': 'Too long.'})
    if not _positive_integer(party_size):
        return _error('partySize must be a positive integer.', 422, {'partySize': 'Enter a value greater than zero.'})
    contact = payload.get('contact')
    if contact is not None and (not isinstance(contact, str) or len(contact) > 40):
        return _error('contact must be a string of 40 characters or fewer.', 422, {'contact': 'Invalid value.'})

    if g.occupie_role == 'customer' and WaitlistEntry.query.filter(
        WaitlistEntry.restaurant_id == g.restaurant_id,
        WaitlistEntry.created_by_id == g.occupie_user.id,
        WaitlistEntry.status.in_(('waiting', 'ready')),
    ).first():
        return _error('You already have an active waitlist entry.', 409)

    entry = WaitlistEntry(
        id=f"WL-{uuid4().hex[:8].upper()}",
        restaurant_id=g.restaurant_id,
        created_by_id=g.occupie_user.id,
        party_name=party_name.strip(),
        party_size=party_size,
        contact=contact.strip() if contact and contact.strip() else None,
    )
    db.session.add(entry)
    _record_audit('waitlist', entry.id, 'waitlist.created', {'partySize': party_size})
    db.session.commit()
    position = None
    if g.occupie_role == 'customer':
        position = WaitlistEntry.query.filter(
            WaitlistEntry.restaurant_id == g.restaurant_id,
            WaitlistEntry.status.in_(('waiting', 'ready')),
            (WaitlistEntry.created_at < entry.created_at)
            | ((WaitlistEntry.created_at == entry.created_at) & (WaitlistEntry.id <= entry.id)),
        ).count()
    return jsonify({'waitlistEntry': entry.to_dict(position=position)}), 201


@operations_bp.route('/waitlist/<string:entry_id>', methods=['PATCH'])
def update_waitlist_entry(entry_id):
    payload, error = _payload()
    if error:
        return error
    entry = WaitlistEntry.query.filter_by(id=entry_id, restaurant_id=g.restaurant_id).first()
    if entry is None:
        return _error('Waitlist entry was not found.', 404)
    if g.occupie_role == 'customer' and (
        entry.created_by_id != g.occupie_user.id or payload.get('status') != 'cancelled'
    ):
        return _error('Customers may only leave their own active waitlist entry.', 403)
    status = payload.get('status')
    if status not in WAITLIST_STATUSES or status == 'seated':
        return _error('status must be waiting, ready, or cancelled.', 422, {'status': 'Invalid status.'})
    allowed_transitions = {
        'waiting': {'ready', 'cancelled'},
        'ready': {'waiting', 'cancelled'},
        'cancelled': set(),
        'seated': set(),
    }
    if status != entry.status and status not in allowed_transitions[entry.status]:
        return _error(f'A waitlist entry cannot move from {entry.status} to {status}.', 409)
    previous_status = entry.status
    entry.status = status
    _record_audit('waitlist', entry.id, 'waitlist.status_changed', {'from': previous_status, 'to': status})
    db.session.commit()
    return jsonify({'waitlistEntry': entry.to_dict()}), 200


@operations_bp.route('/waitlist/<string:entry_id>/seat', methods=['POST'])
@roles_required('manager', 'host')
def seat_waitlist_entry(entry_id):
    lock_error = _lock_restaurant_allocation()
    if lock_error:
        return lock_error
    entry = WaitlistEntry.query.filter_by(id=entry_id, restaurant_id=g.restaurant_id).first()
    if entry is None:
        return _error('Waitlist entry was not found.', 404)
    if entry.status not in ('waiting', 'ready'):
        return _error('Only a waiting or ready party can be seated.', 409)

    ordered_entries = WaitlistEntry.query.filter(
        WaitlistEntry.restaurant_id == g.restaurant_id,
        WaitlistEntry.status.in_(('waiting', 'ready')),
    ).order_by(WaitlistEntry.created_at, WaitlistEntry.id).all()
    next_seatable = next((candidate for candidate in ordered_entries if _recommendation(candidate.party_size)), None)
    if next_seatable is not None and next_seatable.id != entry.id:
        return _error(f'{next_seatable.party_name} has waited longer and can be seated now.', 409)

    payload, error = _payload()
    if error:
        return error
    requested_table_id = payload.get('tableId')
    if requested_table_id:
        table = _table_by_id(requested_table_id, lock=True)
        if table is None:
            return _error('Table was not found.', 404)
        if table.status != 'available' or table.capacity < entry.party_size:
            return _error('Selected table is unavailable or too small for this party.', 409)
        if not _is_table_available_for_party(table, entry.party_size):
            return _error('Selected table is being held for an upcoming reservation.', 409)
    else:
        table = _recommendation(entry.party_size, lock_tables=True)
        if table is None:
            return _error('No suitable table is available for this party.', 409)

    previous_table_status = table.status
    table.status = 'occupied'
    table.party_size = entry.party_size
    table.time_seated = datetime.now(timezone.utc)
    entry.status = 'seated'
    entry.table_id = table.id
    _record_audit('table', table.id, 'table.status_changed', {
        'from': previous_table_status, 'to': 'occupied', 'partySize': table.party_size,
    })
    _record_audit('waitlist', entry.id, 'waitlist.seated', {'tableId': table.id})
    db.session.commit()
    return jsonify({'waitlistEntry': entry.to_dict(), 'table': table.to_dict()}), 200


@operations_bp.route('/reservations/<string:reservation_id>/reassignment', methods=['POST'])
@roles_required('manager', 'host')
def request_reservation_reassignment(reservation_id):
    payload, error = _payload()
    if error:
        return error
    target_id = payload.get('tableId')
    reason = payload.get('reason')
    if not isinstance(target_id, str) or not target_id.strip():
        return _error('tableId is required.', 422, {'tableId': 'Required.'})
    if reason is not None and (not isinstance(reason, str) or len(reason) > 500):
        return _error('reason must be a string of 500 characters or fewer.', 422, {'reason': 'Invalid value.'})
    lock_error = _lock_restaurant_allocation()
    if lock_error:
        return lock_error
    reservation = Reservation.query.filter_by(id=reservation_id, restaurant_id=g.restaurant_id).with_for_update().first()
    if reservation is None:
        return _error('Reservation was not found.', 404)
    if reservation.status not in {'confirmed', 'checked_in'}:
        return _error('Only a confirmed or checked-in reservation can be reassigned.', 409)
    if ReservationReassignment.query.filter_by(
        restaurant_id=g.restaurant_id, reservation_id=reservation.id, status='pending',
    ).first():
        return _error('A manager review is already pending for this reservation.', 409)
    target = _table_by_id(target_id.strip(), lock=True)
    if target is None:
        return _error('Target table was not found.', 404)
    if target.id == reservation.table_id:
        return _error('Choose a different table for reassignment.', 422)
    if target.status != 'available' or not _is_table_available_for_party(
        target, reservation.party_size, reservation.starts_at, exclude_reservation_id=reservation.id,
    ):
        return _error('The target table cannot fit this reservation or is protected for another booking.', 409)
    reassignment = ReservationReassignment(
        id=f'REA-{uuid4().hex[:8].upper()}',
        restaurant_id=g.restaurant_id,
        reservation_id=reservation.id,
        from_table_id=reservation.table_id,
        to_table_id=target.id,
        requested_by_user_id=g.occupie_user.id,
        reason=reason.strip() if reason and reason.strip() else None,
        status='pending',
    )
    db.session.add(reassignment)
    _record_audit('reservation', reservation.id, 'reservation.reassignment_requested', reassignment.to_dict())
    db.session.commit()
    return jsonify({'reassignment': reassignment.to_dict()}), 201


@operations_bp.route('/reassignments', methods=['GET'])
@roles_required('manager')
def list_reassignments():
    requests = ReservationReassignment.query.filter_by(
        restaurant_id=g.restaurant_id, status='pending',
    ).order_by(ReservationReassignment.created_at, ReservationReassignment.id).all()
    return jsonify({'reassignments': [item.to_dict() for item in requests]}), 200


@operations_bp.route('/reassignments/<string:reassignment_id>/status', methods=['PATCH'])
@roles_required('manager')
def review_reassignment(reassignment_id):
    payload, error = _payload()
    if error:
        return error
    status = payload.get('status')
    if status not in {'approved', 'rejected'}:
        return _error('status must be approved or rejected.', 422, {'status': 'Invalid status.'})
    lock_error = _lock_restaurant_allocation()
    if lock_error:
        return lock_error
    reassignment = ReservationReassignment.query.filter_by(
        id=reassignment_id, restaurant_id=g.restaurant_id,
    ).with_for_update().first()
    if reassignment is None:
        return _error('Reassignment request was not found.', 404)
    if reassignment.status != 'pending':
        return _error('This reassignment request has already been reviewed.', 409)
    reservation = Reservation.query.filter_by(
        id=reassignment.reservation_id, restaurant_id=g.restaurant_id,
    ).with_for_update().first()
    if reservation is None or reservation.status not in {'confirmed', 'checked_in'}:
        return _error('The reservation is no longer eligible for reassignment.', 409)
    if status == 'approved':
        if reservation.table_id != reassignment.from_table_id:
            return _error('The reservation assignment changed since this request was made.', 409)
        target = _table_by_id(reassignment.to_table_id, lock=True)
        if target is None or target.status != 'available' or not _is_table_available_for_party(
            target, reservation.party_size, reservation.starts_at, exclude_reservation_id=reservation.id,
        ):
            return _error('The requested table is no longer available. Reject this request and ask the host to choose another table.', 409)
        reservation.table_id = target.id
    reassignment.status = status
    reassignment.reviewed_by_user_id = g.occupie_user.id
    reassignment.reviewed_at = datetime.now(timezone.utc)
    _record_audit('reservation', reservation.id, f'reservation.reassignment_{status}', {
        'requestId': reassignment.id, 'fromTableId': reassignment.from_table_id,
        'toTableId': reassignment.to_table_id,
    })
    db.session.commit()
    return jsonify({'reassignment': reassignment.to_dict(), 'reservation': reservation.to_dict()}), 200


@operations_bp.route('/settings/allocation', methods=['GET', 'PATCH'])
@roles_required('manager', 'host')
def allocation_settings():
    settings = _restaurant_settings()
    if request.method == 'GET':
        return jsonify({'settings': settings.to_dict()}), 200
    payload, error = _payload()
    if error:
        return error
    if g.occupie_role != 'manager':
        return _error('Only a manager may change allocation settings.', 403)
    fields = {
        'turnTimeMinutes': ('turn_time_minutes', 15, 360),
        'reservationHoldMinutes': ('reservation_hold_minutes', 0, 360),
        'gracePeriodMinutes': ('grace_period_minutes', 0, 120),
        'utilizationTargetPercent': ('utilization_target_percent', 1, 100),
    }
    if not payload or any(key not in fields for key in payload):
        return _error('Provide one or more supported allocation settings.', 422)
    if db.session.get(RestaurantSettings, g.restaurant_id) is None:
        db.session.add(settings)
    for key, value in payload.items():
        attribute, minimum, maximum = fields[key]
        if not isinstance(value, int) or isinstance(value, bool) or not minimum <= value <= maximum:
            return _error(f'{key} must be an integer from {minimum} to {maximum}.', 422, {key: 'Out of range.'})
        setattr(settings, attribute, value)
    _record_audit('settings', g.restaurant_id, 'allocation.settings_updated', payload)
    db.session.commit()
    return jsonify({'settings': settings.to_dict()}), 200


@operations_bp.route('/reports/shift', methods=['GET'])
@roles_required('manager')
def shift_report():
    tables = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).all()
    reservations = Reservation.query.filter_by(restaurant_id=g.restaurant_id).all()
    waitlist = WaitlistEntry.query.filter_by(restaurant_id=g.restaurant_id).all()
    settings = _restaurant_settings()
    completed = [
        row for row in reservations
        if row.status == 'completed' and row.seated_at is not None and row.completed_at is not None
    ]
    turn_minutes = []
    for row in completed:
        seated_at = row.seated_at.replace(tzinfo=timezone.utc) if row.seated_at.tzinfo is None else row.seated_at
        completed_at = row.completed_at.replace(tzinfo=timezone.utc) if row.completed_at.tzinfo is None else row.completed_at
        turn_minutes.append(max(0.0, (completed_at - seated_at).total_seconds() / 60))
    table_counts = {status: sum(table.status == status for table in tables) for status in TABLE_STATUSES}
    reservation_counts = {status: sum(row.status == status for row in reservations) for status in RESERVATION_STATUSES}
    waitlist_counts = {status: sum(row.status == status for row in waitlist) for status in WAITLIST_STATUSES}
    return jsonify({
        'report': {
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'tables': {'total': len(tables), 'byStatus': table_counts},
            'reservations': {'total': len(reservations), 'byStatus': reservation_counts},
            'waitlist': {'total': len(waitlist), 'byStatus': waitlist_counts},
            'utilizationPercent': round(100 * table_counts.get('occupied', 0) / len(tables), 1) if tables else None,
            'utilizationTargetPercent': settings.utilization_target_percent,
            'utilizationOnTarget': bool(tables and 100 * table_counts.get('occupied', 0) / len(tables) >= settings.utilization_target_percent),
            'recordedAverageTurnMinutes': round(sum(turn_minutes) / len(turn_minutes), 1) if turn_minutes else None,
            'completedTurnsCount': len(turn_minutes),
        },
    }), 200


@operations_bp.route('/reports/export.csv', methods=['GET'])
@roles_required('manager')
def export_operational_csv():
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(['recordType', 'id', 'status', 'name', 'partySize', 'startsAt', 'tableId', 'capacity', 'section', 'createdAt'])
    for table in RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).order_by(RestaurantTable.id):
        writer.writerow(['table', table.id, table.status, table.name, '', '', table.id, table.capacity, table.section, table.created_at.isoformat()])
    for row in Reservation.query.filter_by(restaurant_id=g.restaurant_id).order_by(Reservation.starts_at, Reservation.id):
        writer.writerow(['reservation', row.id, row.status, row.guest_name, row.party_size, row.starts_at.isoformat(), row.table_id or '', '', '', row.created_at.isoformat()])
    for row in WaitlistEntry.query.filter_by(restaurant_id=g.restaurant_id).order_by(WaitlistEntry.created_at, WaitlistEntry.id):
        writer.writerow(['waitlist', row.id, row.status, row.party_name, row.party_size, '', row.table_id or '', '', '', row.created_at.isoformat()])
    response = make_response(stream.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = 'attachment; filename="occupie-operational-report.csv"'
    return response


@operations_bp.route('/tables/import', methods=['POST'])
@roles_required('manager')
def import_tables_csv():
    payload, error = _payload()
    if error:
        return error
    csv_text = payload.get('csv')
    if not isinstance(csv_text, str) or not csv_text.strip() or len(csv_text.encode('utf-8')) > 1_000_000:
        return _error('csv must contain a non-empty table import under 1 MB.', 422, {'csv': 'Invalid input.'})
    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        required = {'id', 'name', 'capacity', 'section'}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            return _error('CSV headers must include id,name,capacity,section.', 422)
        rows = list(reader)
    except csv.Error:
        return _error('CSV could not be parsed.', 422)
    if not rows or len(rows) > 500:
        return _error('Provide between 1 and 500 table rows.', 422)
    prepared = []
    seen = set()
    for line_number, row in enumerate(rows, start=2):
        table_id = (row.get('id') or '').strip()
        name = (row.get('name') or '').strip()
        section = (row.get('section') or '').strip()
        try:
            capacity = int((row.get('capacity') or '').strip())
        except ValueError:
            capacity = 0
        if (not table_id or len(table_id) > 32 or table_id in seen or not name or len(name) > 80
                or not section or len(section) > 80 or capacity < 1 or capacity > 100):
            return _error(f'CSV row {line_number} has an invalid or duplicate table field.', 422)
        seen.add(table_id)
        prepared.append(RestaurantTable(
            id=table_id, restaurant_id=g.restaurant_id, name=name, capacity=capacity,
            section=section, status='available',
        ))
    existing = RestaurantTable.query.filter(
        RestaurantTable.restaurant_id == g.restaurant_id,
        RestaurantTable.id.in_(seen),
    ).first()
    if existing:
        return _error(f'Table {existing.id} already exists; no rows were imported.', 409)
    db.session.add_all(prepared)
    for table in prepared:
        _record_audit('table', table.id, 'table.imported', {'capacity': table.capacity, 'section': table.section})
    conflict = _commit_or_conflict()
    if conflict:
        return conflict
    return jsonify({'imported': len(prepared), 'tables': [table.to_dict() for table in prepared]}), 201


@operations_bp.route('/allocations/simulate', methods=['POST'])
@roles_required('manager')
def simulate_allocation():
    from app.services.adaptive_allocation import recommend_tables

    payload, error = _payload()
    if error:
        return error
    parties = payload.get('parties')
    if not isinstance(parties, list) or not parties or len(parties) > 20:
        return _error('parties must contain between 1 and 20 seating requests.', 422)
    parsed = []
    for index, party in enumerate(parties):
        if not isinstance(party, dict) or not _positive_integer(party.get('partySize')):
            return _error(f'Party {index + 1} must have a positive integer partySize.', 422)
        try:
            at = _parse_datetime(party['at']) if party.get('at') else datetime.now(timezone.utc)
        except ValueError as exc:
            return _error(str(exc), 422, {'at': str(exc)})
        preference = party.get('preferredSection')
        if preference is not None and not isinstance(preference, str):
            return _error(f'Party {index + 1} preferredSection must be text.', 422)
        parsed.append((party.get('partyId', str(index + 1)), party['partySize'], at, preference))
    tables = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).all()
    reservations = Reservation.query.filter_by(restaurant_id=g.restaurant_id).all()
    settings = _restaurant_settings()
    claimed = set()
    results = []
    for party_id, party_size, at, preference in parsed:
        candidates = [table for table in tables if table.id not in claimed]
        choices = recommend_tables(
            candidates, party_size, reservations=reservations, at=at,
            preferred_section=preference, restaurant_id=g.restaurant_id,
            return_all_candidates=False,
            reservation_hold_minutes=settings.reservation_hold_minutes,
            turn_time_minutes=settings.turn_time_minutes,
        )
        if choices:
            selected = choices[0]
            claimed.add(selected.table.id)
            results.append({'partyId': party_id, 'partySize': party_size, 'table': selected.table.to_dict(), 'reason': selected.reason})
        else:
            results.append({'partyId': party_id, 'partySize': party_size, 'table': None, 'reason': _allocation_failure_payload(party_size)['message']})
    return jsonify({'simulation': results, 'persisted': False}), 200


@operations_bp.route('/allocations/recommend', methods=['GET'])
def allocation_recommendation():
    """Enhanced allocation recommendation using adaptive scoring.
    
    Query params:
        party_size (required): Number of guests
        at (optional): ISO 8601 datetime for seating
        preferred_section (optional): Preferred table section
        return_alternatives (optional): If 'true', return all ranked candidates
        use_legacy (optional): If 'true', use old deterministic allocator
    """
    raw_party_size = request.args.get('party_size', '')
    try:
        party_size = int(raw_party_size)
    except (TypeError, ValueError):
        return _error('party_size must be a positive integer.', 422, {'party_size': 'Enter a value greater than zero.'})
    if not _positive_integer(party_size):
        return _error('party_size must be a positive integer.', 422, {'party_size': 'Enter a value greater than zero.'})

    try:
        at = _parse_datetime(request.args['at']) if request.args.get('at') else datetime.now(timezone.utc)
    except ValueError as exc:
        return _error(str(exc), 422, {'at': str(exc)})
    preferred_section = request.args.get('preferred_section')
    if preferred_section is not None and len(preferred_section) > 80:
        return _error('preferred_section must be 80 characters or fewer.', 422, {'preferred_section': 'Too long.'})
    
    # Support legacy mode for backward compatibility during transition
    use_legacy = request.args.get('use_legacy', '').lower() == 'true'
    return_alternatives = request.args.get('return_alternatives', '').lower() == 'true'
    
    if use_legacy:
        # Keep the optional legacy contract for existing clients.
        settings = _restaurant_settings()
        tables = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).all()
        reservations = Reservation.query.filter_by(restaurant_id=g.restaurant_id).all()
        table = recommend_table(
            tables, party_size, reservations=reservations, at=at,
            preferred_section=preferred_section,
            reservation_hold_minutes=settings.reservation_hold_minutes,
            turn_time_minutes=settings.turn_time_minutes,
        )
        if table is None:
            unavailable = _allocation_failure_payload(party_size)
            return jsonify({
                'available': False,
                'recommendation': None,
                **unavailable,
                'strategy': 'legacy_deterministic',
            }), 200
        return jsonify({
            'available': True,
            'recommendation': table.to_dict(),
            'strategy': 'legacy_deterministic',
        }), 200
    
    # Use new adaptive scoring engine
    from app.services.adaptive_allocation import recommend_tables
    from app.services.allocation_policy import get_policy
    
    tables = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).all()
    reservations = Reservation.query.filter_by(restaurant_id=g.restaurant_id).all()
    settings = _restaurant_settings()
    
    recommendations = recommend_tables(
        tables=tables,
        party_size=party_size,
        reservations=reservations,
        at=at,
        preferred_section=preferred_section,
        restaurant_id=g.restaurant_id,
        return_all_candidates=return_alternatives,
        reservation_hold_minutes=settings.reservation_hold_minutes,
        turn_time_minutes=settings.turn_time_minutes,
    )
    
    if not recommendations:
        unavailable = _allocation_failure_payload(party_size)
        return jsonify({
            'available': False,
            'recommendation': None,  # Legacy format
            'primaryRecommendation': None,
            'alternatives': [],
            **unavailable,
            'occupiedTurnoverPredicted': False,
            'strategy': 'adaptive_scoring',
            'configuration': {**get_policy(g.restaurant_id).to_dict(), **settings.to_dict()},
        }), 200
    
    primary = recommendations[0]
    alternatives = recommendations[1:] if return_alternatives else []
    
    # Return both legacy and new format for backward compatibility
    return jsonify({
        'available': True,
        'recommendation': primary.table.to_dict(),  # Legacy format for existing tests
        'primaryRecommendation': primary.to_dict(),
        'alternatives': [alt.to_dict() for alt in alternatives],
        'occupiedTurnoverPredicted': False,
        'strategy': 'adaptive_scoring',
        'configuration': {**get_policy(g.restaurant_id).to_dict(), **settings.to_dict()},
    }), 200
