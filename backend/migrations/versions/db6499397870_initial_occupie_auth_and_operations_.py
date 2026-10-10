"""Initial Occupie authentication and operations schema.

This migration also upgrades the original create_all() development schema. It
keeps existing records and assigns legacy operational rows to the default
restaurant.
"""
from alembic import op
import sqlalchemy as sa


revision = 'db6499397870'
down_revision = None
branch_labels = None
depends_on = None


def _tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table):
    return {column['name'] for column in sa.inspect(op.get_bind()).get_columns(table)}


def _indexes(table):
    return {index['name'] for index in sa.inspect(op.get_bind()).get_indexes(table)}


def _add_column(table, name, column):
    if name not in _columns(table):
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(column)


def _add_index(table, name, columns, unique=False):
    if name not in _indexes(table):
        op.create_index(name, table, columns, unique=unique)


def upgrade():
    if 'restaurants' not in _tables():
        op.create_table(
            'restaurants',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('name', sa.String(160), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        )
    op.get_bind().execute(sa.text(
        "INSERT INTO restaurants (id, name, created_at) "
        "SELECT 'default', 'Occupie Restaurant', CURRENT_TIMESTAMP "
        "WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE id = 'default')"
    ))

    if 'revoked_tokens' not in _tables():
        op.create_table(
            'revoked_tokens',
            sa.Column('jti', sa.String(36), primary_key=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        )
    _add_index('revoked_tokens', 'ix_revoked_tokens_expires_at', ['expires_at'])

    if 'users' not in _tables():
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(120), nullable=False),
            sa.Column('email', sa.String(120), nullable=False),
            sa.Column('password_hash', sa.String(256), nullable=False),
            sa.Column('role', sa.String(32), nullable=False, server_default='customer'),
            sa.Column('email_verified_at', sa.DateTime(timezone=True)),
            sa.Column('verification_token_hash', sa.String(64)),
            sa.Column('verification_expires_at', sa.DateTime(timezone=True)),
            sa.Column('password_reset_token_hash', sa.String(64)),
            sa.Column('password_reset_expires_at', sa.DateTime(timezone=True)),
            sa.Column('auth_version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )
    else:
        _add_column('users', 'email_verified_at', sa.Column('email_verified_at', sa.DateTime(timezone=True)))
        _add_column('users', 'verification_token_hash', sa.Column('verification_token_hash', sa.String(64)))
        _add_column('users', 'verification_expires_at', sa.Column('verification_expires_at', sa.DateTime(timezone=True)))
        _add_column('users', 'password_reset_token_hash', sa.Column('password_reset_token_hash', sa.String(64)))
        _add_column('users', 'password_reset_expires_at', sa.Column('password_reset_expires_at', sa.DateTime(timezone=True)))
        _add_column('users', 'auth_version', sa.Column('auth_version', sa.Integer(), nullable=False, server_default='1'))
    _add_index('users', 'ix_users_email', ['email'], unique=True)
    _add_index('users', 'ix_users_password_reset_token_hash', ['password_reset_token_hash'])
    _add_index('users', 'ix_users_verification_token_hash', ['verification_token_hash'])

    if 'restaurant_memberships' not in _tables():
        op.create_table(
            'restaurant_memberships',
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('role', sa.String(32), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint("role in ('manager', 'host', 'floor_staff')", name='ck_membership_staff_role'),
        )

    if 'restaurant_tables' not in _tables():
        op.create_table(
            'restaurant_tables',
            sa.Column('id', sa.String(32), primary_key=True),
            sa.Column('restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id'), nullable=False, server_default='default'),
            sa.Column('name', sa.String(80), nullable=False),
            sa.Column('capacity', sa.Integer(), nullable=False),
            sa.Column('section', sa.String(80), nullable=False, server_default='Main Dining'),
            sa.Column('status', sa.String(16), nullable=False, server_default='available'),
            sa.Column('assigned_server', sa.String(120)),
            sa.Column('party_size', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('time_seated', sa.DateTime(timezone=True)),
        )
    else:
        _add_column('restaurant_tables', 'restaurant_id', sa.Column(
            'restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id', name='fk_restaurant_tables_restaurant_id'), nullable=False, server_default='default'))
    _add_index('restaurant_tables', 'ix_restaurant_tables_restaurant_id', ['restaurant_id'])
    _add_index('restaurant_tables', 'ix_restaurant_tables_status', ['status'])

    if 'reservations' not in _tables():
        op.create_table(
            'reservations',
            sa.Column('id', sa.String(40), primary_key=True),
            sa.Column('restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id'), nullable=False, server_default='default'),
            sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id')),
            sa.Column('guest_name', sa.String(120), nullable=False),
            sa.Column('party_size', sa.Integer(), nullable=False),
            sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('table_id', sa.String(32), sa.ForeignKey('restaurant_tables.id')),
            sa.Column('status', sa.String(20), nullable=False, server_default='confirmed'),
            sa.Column('phone', sa.String(40)),
            sa.Column('notes', sa.String(500)),
            sa.Column('preferred_section', sa.String(80)),
        )
    else:
        _add_column('reservations', 'restaurant_id', sa.Column(
            'restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id', name='fk_reservations_restaurant_id'), nullable=False, server_default='default'))
        _add_column('reservations', 'customer_id', sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_reservations_customer_id')))
    _add_index('reservations', 'ix_reservations_customer_id', ['customer_id'])
    _add_index('reservations', 'ix_reservations_restaurant_id', ['restaurant_id'])
    _add_index('reservations', 'ix_reservations_starts_at', ['starts_at'])
    _add_index('reservations', 'ix_reservations_status', ['status'])

    if 'waitlist_entries' not in _tables():
        op.create_table(
            'waitlist_entries',
            sa.Column('id', sa.String(40), primary_key=True),
            sa.Column('restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id'), nullable=False, server_default='default'),
            sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id')),
            sa.Column('party_name', sa.String(120), nullable=False),
            sa.Column('party_size', sa.Integer(), nullable=False),
            sa.Column('contact', sa.String(40)),
            sa.Column('status', sa.String(20), nullable=False, server_default='waiting'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('table_id', sa.String(32), sa.ForeignKey('restaurant_tables.id')),
        )
    else:
        _add_column('waitlist_entries', 'restaurant_id', sa.Column(
            'restaurant_id', sa.String(36), sa.ForeignKey('restaurants.id', name='fk_waitlist_entries_restaurant_id'), nullable=False, server_default='default'))
        _add_column('waitlist_entries', 'created_by_id', sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', name='fk_waitlist_entries_created_by_id')))
    _add_index('waitlist_entries', 'ix_waitlist_entries_created_at', ['created_at'])
    _add_index('waitlist_entries', 'ix_waitlist_entries_restaurant_id', ['restaurant_id'])
    _add_index('waitlist_entries', 'ix_waitlist_entries_status', ['status'])


def downgrade():
    raise RuntimeError('The initial Occupie migration is intentionally irreversible to protect existing user and booking data.')
