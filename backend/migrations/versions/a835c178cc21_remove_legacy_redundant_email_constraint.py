"""Remove the original email constraint after replacing it with a unique index."""
from alembic import op
import sqlalchemy as sa

revision = 'a835c178cc21'
down_revision = 'd2945e6b75df'
branch_labels = None
depends_on = None


def upgrade():
    constraints = sa.inspect(op.get_bind()).get_unique_constraints('users')
    legacy = next((row['name'] for row in constraints if row.get('name') == 'uq_users_email'), None)
    if legacy:
        with op.batch_alter_table('users') as batch_op:
            batch_op.drop_constraint(legacy, type_='unique')


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.create_unique_constraint('uq_users_email', ['email'])
