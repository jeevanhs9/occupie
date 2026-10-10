import click
from flask.cli import with_appcontext
from app.services.no_show import process_late_arrivals
from app.extensions import db

@click.command('process-no-shows')
@click.argument('restaurant_id')
@with_appcontext
def process_no_shows_command(restaurant_id):
    """Identify and mark late arrivals as no-shows."""
    count = process_late_arrivals(restaurant_id)
    click.echo(f"Processed {count} late arrivals.")

# Register with app (inside create_app in app/__init__.py)
# app.cli.add_command(process_no_shows_command)
