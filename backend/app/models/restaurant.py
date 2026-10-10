from datetime import datetime, timezone
from sqlalchemy import JSON

from app.extensions import db


class Restaurant(db.Model):
    __tablename__ = 'restaurants'

    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(160), nullable=False)
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
