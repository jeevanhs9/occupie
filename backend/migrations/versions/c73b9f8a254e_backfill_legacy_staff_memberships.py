"""Attach pre-existing staff accounts to the default restaurant."""
from alembic import op
import sqlalchemy as sa

revision = 'c73b9f8a254e'
down_revision = 'a835c178cc21'
branch_labels = None
depends_on = None


def upgrade():
    op.get_bind().execute(sa.text(
        "INSERT INTO restaurant_memberships (user_id, restaurant_id, role, created_at) "
        "SELECT users.id, 'default', users.role, CURRENT_TIMESTAMP FROM users "
        "WHERE users.role IN ('manager', 'host', 'floor_staff') "
        "AND NOT EXISTS (SELECT 1 FROM restaurant_memberships "
        "WHERE restaurant_memberships.user_id = users.id "
        "AND restaurant_memberships.restaurant_id = 'default')"
    ))


def downgrade():
    # The membership may have been edited since migration; preserve operator changes.
    pass
