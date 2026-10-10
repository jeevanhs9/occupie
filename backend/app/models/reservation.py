from datetime import datetime, timezone

from sqlalchemy import Index, text
from app.extensions import db

RESERVATION_STATUSES = ('confirmed', 'checked_in', 'seated', 'completed', 'cancelled', 'no_show')


class Reservation(db.Model):
    """A guest booking and its optional table assignment."""

    __tablename__ = 'reservations'
    __table_args__ = (
        Index(
            'uq_active_customer_reservation_time',
            'restaurant_id', 'customer_id', 'starts_at',
            unique=True,
            postgresql_where=text("customer_id IS NOT NULL AND status IN ('confirmed', 'checked_in', 'seated')"),
            sqlite_where=text("customer_id IS NOT NULL AND status IN ('confirmed', 'checked_in', 'seated')"),
        ),
    )

    id = db.Column(db.String(40), primary_key=True)
    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id'), nullable=False, default='default', index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    guest_name = db.Column(db.String(120), nullable=False)
    party_size = db.Column(db.Integer, nullable=False)
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    table_id = db.Column(db.String(32), db.ForeignKey('restaurant_tables.id'), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='confirmed', index=True)
    phone = db.Column(db.String(40), nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    preferred_section = db.Column(db.String(80), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    seated_at = db.Column(db.DateTime(timezone=True), nullable=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    table = db.relationship('RestaurantTable', backref='reservations')
    restaurant = db.relationship('Restaurant')

    def to_dict(self):
        starts_at = self.starts_at
        if starts_at and starts_at.tzinfo is None:
            # SQLite drops timezone metadata for DateTime(timezone=True).
            # Reservation timestamps are normalized to UTC at the API boundary.
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        if starts_at:
            starts_at = starts_at.astimezone(timezone.utc)
        return {
            'id': self.id,
            'restaurantName': self.restaurant.name if self.restaurant else None,
            'guestName': self.guest_name,
            'partySize': self.party_size,
            'startsAt': starts_at.isoformat().replace('+00:00', 'Z') if starts_at else None,
            'time': starts_at.strftime('%H:%M') if starts_at else None,
            'table': self.table_id,
            'status': self.status,
            'phone': self.phone,
            'notes': self.notes,
            'seatingPreference': self.preferred_section,
            'seatedAt': self.seated_at.isoformat() if self.seated_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
        }


class ReservationReassignment(db.Model):
    """A host request that a manager review a reservation table change."""

    __tablename__ = 'reservation_reassignments'

    id = db.Column(db.String(40), primary_key=True)
    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id', ondelete='CASCADE'), nullable=False, index=True)
    reservation_id = db.Column(db.String(40), db.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False, index=True)
    from_table_id = db.Column(db.String(32), db.ForeignKey('restaurant_tables.id'), nullable=False)
    to_table_id = db.Column(db.String(32), db.ForeignKey('restaurant_tables.id'), nullable=False)
    requested_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reason = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(16), nullable=False, default='pending', index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'reservationId': self.reservation_id,
            'fromTable': self.from_table_id,
            'toTable': self.to_table_id,
            'reason': self.reason,
            'status': self.status,
            'requestedByUserId': self.requested_by_user_id,
            'reviewedByUserId': self.reviewed_by_user_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
        }
