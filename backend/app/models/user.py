from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

VALID_ROLES = ('manager', 'host', 'floor_staff', 'customer')


class User(db.Model):
    """
    User model foundation representing staff and customers.
    Restricted to manager, host, floor_staff, and customer roles.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(32), nullable=False, default='customer')
    email_verified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    verification_token_hash = db.Column(db.String(64), nullable=True, index=True)
    verification_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    password_reset_token_hash = db.Column(db.String(64), nullable=True, index=True)
    password_reset_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    auth_version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __init__(self, name, email, role='customer', password=None):
        self.name = name.strip()
        self.email = email.strip().lower()
        self.set_role(role)
        if password:
            self.set_password(password)

    def set_role(self, role):
        if role not in VALID_ROLES:
            raise ValueError(
                f"Invalid role '{role}'. Allowed roles are: {', '.join(VALID_ROLES)}"
            )
        self.role = role

    def set_password(self, password):
        """Hashes password securely using Werkzeug."""
        if not password or len(password) < 12 or len(password) > 128:
            raise ValueError("Password must be between 12 and 128 characters long.")
        self.password_hash = generate_password_hash(password, method='scrypt')

    def check_password(self, password):
        """Verifies candidate password against stored hash."""
        if not self.password_hash or not password:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Safely serializes user representation without password hash."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"
