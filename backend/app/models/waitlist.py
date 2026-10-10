from datetime import datetime, timezone

from app.extensions import db

WAITLIST_STATUSES = ('waiting', 'ready', 'seated', 'cancelled')


class WaitlistEntry(db.Model):
    """A walk-in party waiting to be seated."""

    __tablename__ = 'waitlist_entries'

    id = db.Column(db.String(40), primary_key=True)
    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id'), nullable=False, default='default', index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    party_name = db.Column(db.String(120), nullable=False)
    party_size = db.Column(db.Integer, nullable=False)
    contact = db.Column(db.String(40), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='waiting', index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    table_id = db.Column(db.String(32), db.ForeignKey('restaurant_tables.id'), nullable=True)

    table = db.relationship('RestaurantTable')

    def to_dict(self, now=None):
        current_time = now or datetime.now(timezone.utc)
        created_at = self.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        wait_minutes = max(0, int((current_time - created_at).total_seconds() // 60))
        return {
            'id': self.id,
            'partyName': self.party_name,
            'partySize': self.party_size,
            'contact': self.contact,
            'status': self.status,
            'waitMinutes': wait_minutes,
            'quotedWait': None,
            'table': self.table_id,
            'createdAt': created_at.isoformat(),
        }
