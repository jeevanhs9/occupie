from datetime import timedelta, timezone


DEFAULT_RESERVATION_HOLD_MINUTES = 90


def recommend_table(tables, party_size, reservations=(), at=None, hold_minutes=DEFAULT_RESERVATION_HOLD_MINUTES, preferred_section=None):
    """Return the smallest suitable available table, preserving reservation holds.

    The deterministic MVP strategy minimizes unused seats, then uses table id for
    a stable tie break. A confirmed reservation blocks its table from
    ``hold_minutes`` before its start until that start time. This is a simple
    operating rule, not a prediction of when an occupied table will clear.
    """
    if not isinstance(party_size, int) or isinstance(party_size, bool) or party_size < 1:
        raise ValueError('party_size must be a positive integer.')

    if at is not None and at.tzinfo is None:
        at = at.replace(tzinfo=timezone.utc)

    available = []
    for table in tables:
        if table.status != 'available' or table.capacity < party_size:
            continue

        reservation_hold = False
        if at is not None:
            reservation_hold = any(
                reservation.table_id == table.id
                and reservation.status in ('confirmed', 'checked_in')
                and _overlaps_hold_window(at, reservation.starts_at, hold_minutes)
                for reservation in reservations
            )
        if not reservation_hold:
            available.append(table)

    return min(
        available,
        key=lambda table: (
            0 if preferred_section and table.section.casefold() == preferred_section.casefold() else 1,
            table.capacity - party_size,
            table.id,
        ),
        default=None,
    )


def _overlaps_hold_window(at, reservation_start, hold_minutes):
    if reservation_start.tzinfo is None:
        reservation_start = reservation_start.replace(tzinfo=timezone.utc)
    reservation_window_start = reservation_start - timedelta(minutes=hold_minutes)
    reservation_window_end = reservation_start + timedelta(minutes=hold_minutes)
    party_window_end = at + timedelta(minutes=hold_minutes)
    return at < reservation_window_end and party_window_end > reservation_window_start
