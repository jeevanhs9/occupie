from datetime import datetime, timezone
from sqlalchemy import JSON, CheckConstraint

from app.extensions import db


class Restaurant(db.Model):
    __tablename__ = 'restaurants'

    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    allocation_version = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class RestaurantMembership(db.Model):
    __tablename__ = 'restaurant_memberships'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id', ondelete='CASCADE'), primary_key=True)
    role = db.Column(db.String(32), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        db.CheckConstraint("role in ('manager', 'host', 'floor_staff')", name='ck_membership_staff_role'),
    )


class RestaurantSettings(db.Model):
    """Persisted operating rules used by allocation and shift reporting."""

    __tablename__ = 'restaurant_settings'
    __table_args__ = (
        CheckConstraint('turn_time_minutes BETWEEN 15 AND 360', name='ck_settings_turn_time'),
        CheckConstraint('reservation_hold_minutes BETWEEN 0 AND 360', name='ck_settings_reservation_hold'),
        CheckConstraint('grace_period_minutes BETWEEN 0 AND 120', name='ck_settings_grace_period'),
        CheckConstraint('utilization_target_percent BETWEEN 1 AND 100', name='ck_settings_utilization_target'),
    )

    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id', ondelete='CASCADE'), primary_key=True)
    turn_time_minutes = db.Column(db.Integer, nullable=False, default=90)
    reservation_hold_minutes = db.Column(db.Integer, nullable=False, default=90)
    grace_period_minutes = db.Column(db.Integer, nullable=False, default=15)
    utilization_target_percent = db.Column(db.Integer, nullable=False, default=75)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'turnTimeMinutes': self.turn_time_minutes,
            'reservationHoldMinutes': self.reservation_hold_minutes,
            'gracePeriodMinutes': self.grace_period_minutes,
            'utilizationTargetPercent': self.utilization_target_percent,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


class RevokedToken(db.Model):
    __tablename__ = 'revoked_tokens'

    jti = db.Column(db.String(36), primary_key=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)


class AuditEvent(db.Model):
    __tablename__ = 'audit_events'

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.String(36), db.ForeignKey('restaurants.id', ondelete='CASCADE'), nullable=False, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    entity_type = db.Column(db.String(32), nullable=False)
    entity_id = db.Column(db.String(40), nullable=False)
    action = db.Column(db.String(40), nullable=False)
    details = db.Column(JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
