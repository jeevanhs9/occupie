from app.extensions import db

RESERVATION_STATUSES = ('confirmed', 'checked_in', 'seated', 'cancelled', 'no_show')


class Reservation(db.Model):
    """A guest booking and its optional table assignment."""

    __tablename__ = 'reservations'

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

    table = db.relationship('RestaurantTable', backref='reservations')

    def to_dict(self):
        return {
            'id': self.id,
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
