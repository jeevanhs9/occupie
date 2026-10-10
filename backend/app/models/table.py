from app.extensions import db

TABLE_STATUSES = ('available', 'occupied', 'reserved', 'cleaning')


class RestaurantTable(db.Model):
    """A restaurant table and its current service status."""

    __tablename__ = 'restaurant_tables'

    id = db.Column(db.String(32), primary_key=True)
    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id'), nullable=False, default='default', index=True)
    name = db.Column(db.String(80), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(80), nullable=False, default='Main Dining')
    status = db.Column(db.String(16), nullable=False, default='available', index=True)
    assigned_server = db.Column(db.String(120), nullable=True)
    party_size = db.Column(db.Integer, nullable=False, default=0)
    time_seated = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'capacity': self.capacity,
            'section': self.section,
            'status': self.status,
            'assignedServer': self.assigned_server,
            'partySize': self.party_size,
            'timeSeated': self.time_seated.isoformat() if self.time_seated else None,
        }
