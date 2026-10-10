from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import get_current_user, verify_jwt_in_request
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import (
    RestaurantTable,
    Reservation,
    WaitlistEntry,
    Restaurant,
    RestaurantMembership,
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

    payload = request.get_json(silent=True) or {}
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
    if path.startswith('/tables'):
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
    return query.first()


def _recommendation(party_size, at=None, preferred_section=None, lock_tables=False):
    table_query = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).order_by(RestaurantTable.id)
    if lock_tables:
        table_query = table_query.with_for_update()
    tables = table_query.all()
    reservations = Reservation.query.filter(
        Reservation.restaurant_id == g.restaurant_id,
        Reservation.status.in_(('confirmed', 'checked_in')),
        Reservation.table_id.isnot(None),
    ).all()
    return recommend_table(
        tables,
        party_size,
        reservations=reservations,
        at=at or datetime.now(timezone.utc),
        preferred_section=preferred_section,
    )


def _is_table_available_for_party(table, party_size, at=None, exclude_reservation_id=None):
    if table is None:
        return False
    reservations = Reservation.query.filter(
        Reservation.restaurant_id == g.restaurant_id,
        Reservation.status.in_(('confirmed', 'checked_in')),
        Reservation.table_id == table.id,
    ).all()
    return is_table_available(
        table,
        party_size,
        reservations=reservations,
        at=at or datetime.now(timezone.utc),
        exclude_reservation_id=exclude_reservation_id,
    )


@operations_bp.route('/tables', methods=['GET', 'POST'])
def tables_collection():
    if request.method == 'GET':
        tables = RestaurantTable.query.filter_by(restaurant_id=g.restaurant_id).order_by(RestaurantTable.id).all()
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
        return _error('No suitable table is available for that party and time.', 409)

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
    reservation = Reservation.query.filter_by(id=reservation_id, restaurant_id=g.restaurant_id).first()
    if reservation is None:
        return _error('Reservation was not found.', 404)
    status = payload.get('status')
    if status not in RESERVATION_STATUSES:
        return _error(f"status must be one of: {', '.join(RESERVATION_STATUSES)}.", 422, {'status': 'Invalid status.'})
    allowed_transitions = {
        'confirmed': {'checked_in', 'seated', 'cancelled', 'no_show'},
        'checked_in': {'seated', 'cancelled', 'no_show'},
        'seated': set(),
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
        _record_audit('table', table.id, 'table.status_changed', {
            'from': previous_table_status, 'to': 'occupied', 'partySize': table.party_size,
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
def seat_waitlist_entry(entry_id):
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


@operations_bp.route('/allocations/recommend', methods=['GET'])
def allocation_recommendation():
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
    table = _recommendation(party_size, at, preferred_section)
    if table is None:
        return jsonify({
            'available': False,
            'recommendation': None,
            'message': 'No suitable table is currently available. No wait time estimate is available.',
        }), 200
    return jsonify({
        'available': True,
        'recommendation': table.to_dict(),
        'strategy': 'smallest_suitable_available_table',
    }), 200
