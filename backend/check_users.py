#!/usr/bin/env python
"""Debug script to check user accounts in database."""
from app import create_app
from app.models import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f'Total users: {len(users)}')
    for u in users[:10]:
        print(f'User: {u.email}, has password_hash: {bool(u.password_hash)}, role: {u.role}')
        # Try checking a password
        if u.email == 'test@example.com':
            try:
                result = u.check_password('testpassword123')
                print(f'  Password check result: {result}')
            except Exception as e:
                print(f'  Password check error: {e}')
