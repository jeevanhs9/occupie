"""add manager-reviewed reservation reassignments

Revision ID: a6b7c8d9e012
Revises: f21c6a0b3e72
Create Date: 2026-10-11 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a6b7c8d9e012'
down_revision = 'f21c6a0b3e72'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'reservation_reassignments',
        sa.Column('id', sa.String(length=40), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('reservation_id', sa.String(length=40), nullable=False),
        sa.Column('from_table_id', sa.String(length=32), nullable=False),
        sa.Column('to_table_id', sa.String(length=32), nullable=False),
        sa.Column('requested_by_user_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['from_table_id'], ['restaurant_tables.id']),
        sa.ForeignKeyConstraint(['to_table_id'], ['restaurant_tables.id']),
        sa.ForeignKeyConstraint(['requested_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reservation_id'], ['reservations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_reservation_reassignments_restaurant_id', 'reservation_reassignments', ['restaurant_id'])
    op.create_index('ix_reservation_reassignments_reservation_id', 'reservation_reassignments', ['reservation_id'])
    op.create_index('ix_reservation_reassignments_status', 'reservation_reassignments', ['status'])


def downgrade():
    op.drop_index('ix_reservation_reassignments_status', table_name='reservation_reassignments')
    op.drop_index('ix_reservation_reassignments_reservation_id', table_name='reservation_reassignments')
    op.drop_index('ix_reservation_reassignments_restaurant_id', table_name='reservation_reassignments')
    op.drop_table('reservation_reassignments')
