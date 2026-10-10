import os
from app import create_app
from app.extensions import db

app = create_app(os.environ.get('FLASK_ENV', 'development'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')

    # Create tables if running in development mode
    with app.app_context():
        try:
            db.create_all()
        except Exception as exc:
            print(f"[Occupie DB Notice] Database tables initialization skipped or failed: {exc}")

    print(f" * Occupie API v1 starting on http://localhost:{port}")
    app.run(host=host, port=port, debug=app.config.get('DEBUG', False))
