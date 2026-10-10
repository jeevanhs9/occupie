"""Deterministic table allocation rules shared by operational endpoints."""

from datetime import datetime, timedelta, timezone


DEFAULT_RESERVATION_HOLD_MINUTES = 90
ACTIVE_RESERVATION_STATUSES = ('confirmed', 'checked_in')


def _as_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def reservation_conflicts(reservation, at, hold_minutes=DEFAULT_RESERVATION_HOLD_MINUTES):
    """Return whether a live booking protects its assigned table at ``at``."""
    if reservation.status not in ACTIVE_RESERVATION_STATUSES:
        return False
    starts_at = _as_utc(reservation.starts_at)
    requested_at = _as_utc(at)
    return abs((starts_at - requested_at).total_seconds()) < hold_minutes * 60


def recommend_table(
    tables,
    party_size,
    reservations=(),
    at=None,
    preferred_section=None,
    reservation_hold_minutes=DEFAULT_RESERVATION_HOLD_MINUTES,
):
    """Choose the smallest currently available table that fits the party.

    A table is held for confirmed and checked-in reservations within the
    configured protection window. Occupied, reserved, and cleaning tables are
    never offered for a new allocation.
    """
    if not isinstance(party_size, int) or isinstance(party_size, bool) or party_size < 1:
        return None

    requested_at = _as_utc(at or datetime.now(timezone.utc))
    held_table_ids = {
        reservation.table_id
        for reservation in reservations
        if reservation.table_id and reservation_conflicts(
            reservation, requested_at, reservation_hold_minutes
        )
    }

    candidates = [
        table for table in tables
        if table.status == 'available'
        and table.capacity >= party_size
        and table.id not in held_table_ids
    ]
    candidates.sort(key=lambda table: (
        0 if preferred_section and table.section.casefold() == preferred_section.casefold() else 1,
        table.capacity - party_size,
        str(table.id),
    ))
    return candidates[0] if candidates else None


def is_table_available(
    table,
    party_size,
    reservations=(),
    at=None,
    exclude_reservation_id=None,
):
    """Check a specific table for seating, ignoring the booking being seated."""
    if table is None or table.status not in ('available', 'reserved') or table.capacity < party_size:
        return False
    requested_at = _as_utc(at or datetime.now(timezone.utc))
    return not any(
        reservation.table_id == table.id
        and reservation.id != exclude_reservation_id
        and reservation_conflicts(reservation, requested_at)
        for reservation in reservations
    )
