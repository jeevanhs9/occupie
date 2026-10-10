"""persist operating policy and reservation lifecycle timestamps

Revision ID: f21c6a0b3e72
Revises: e880f4e1dce4
Create Date: 2026-10-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f21c6a0b3e72'
down_revision = 'e880f4e1dce4'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('restaurants') as batch_op:
        batch_op.add_column(sa.Column('allocation_version', sa.Integer(), nullable=False, server_default='0'))
    op.create_table(
        'restaurant_settings',
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('turn_time_minutes', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('reservation_hold_minutes', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('grace_period_minutes', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('utilization_target_percent', sa.Integer(), nullable=False, server_default='75'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('turn_time_minutes BETWEEN 15 AND 360', name='ck_settings_turn_time'),
        sa.CheckConstraint('reservation_hold_minutes BETWEEN 0 AND 360', name='ck_settings_reservation_hold'),
        sa.CheckConstraint('grace_period_minutes BETWEEN 0 AND 120', name='ck_settings_grace_period'),
        sa.CheckConstraint('utilization_target_percent BETWEEN 1 AND 100', name='ck_settings_utilization_target'),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('restaurant_id'),
    )
    with op.batch_alter_table('reservations') as batch_op:
        batch_op.add_column(sa.Column('seated_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    with op.batch_alter_table('reservations') as batch_op:
        batch_op.drop_column('completed_at')
        batch_op.drop_column('seated_at')
    op.drop_table('restaurant_settings')
    with op.batch_alter_table('restaurants') as batch_op:
        batch_op.drop_column('allocation_version')
