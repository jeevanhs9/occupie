from datetime import datetime, timedelta, timezone
from app.models import Reservation, AuditLog
from app.extensions import db

def process_late_arrivals(restaurant_id):
    grace_period = timedelta(minutes=15)
    late_limit = datetime.now(timezone.utc) - grace_period

    late_reservations = Reservation.query.filter(
        Reservation.restaurant_id == restaurant_id,
        Reservation.start_time < late_limit,
        Reservation.status == 'confirmed'
    ).all()

    for res in late_reservations:
        res.status = 'no-show'
        # Log event (AuditLog requires actor_id, need a system actor or manager)
        # Using a dummy ID 0 or admin for system events
        # log = AuditLog(event_type='no-show', actor_id=0, target_id=res.id, reason="Late arrival")
        # db.session.add(log)

    db.session.commit()
    return len(late_reservations)
