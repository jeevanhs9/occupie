from datetime import datetime, timezone

from sqlalchemy import Index, text
from app.extensions import db

RESERVATION_STATUSES = ('confirmed', 'checked_in', 'seated', 'cancelled', 'no_show')


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

    table = db.relationship('RestaurantTable', backref='reservations')
    restaurant = db.relationship('Restaurant')

    def to_dict(self):
        return {
            'id': self.id,
            'restaurantName': self.restaurant.name if self.restaurant else None,
            'guestName': self.guest_name,
            'partySize': self.party_size,
            'startsAt': self.starts_at.isoformat() if self.starts_at else None,
            'time': self.starts_at.strftime('%H:%M') if self.starts_at else None,
            'table': self.table_id,
            'status': self.status,
            'phone': self.phone,
            'notes': self.notes,
            'seatingPreference': self.preferred_section,
        }
