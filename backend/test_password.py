#!/usr/bin/env python
"""Debug password hashing issue."""
from werkzeug.security import generate_password_hash, check_password_hash
from app import create_app
from app.models import User
from app.extensions import db

app = create_app()
with app.app_context():
    # Get the test user
    user = User.query.filter_by(email='test@example.com').first()
    if user:
        print(f'User found: {user.email}')
        print(f'Password hash (first 50 chars): {user.password_hash[:50]}...')
        print(f'Password hash length: {len(user.password_hash)}')
        print(f'Hash method: {user.password_hash.split("$")[0] if "$" in user.password_hash else "unknown"}')
        
        # Test the password
        test_password = 'testpassword123'
        result = check_password_hash(user.password_hash, test_password)
        print(f'\nPassword check for "{test_password}": {result}')
        
        # Try creating a new hash and testing it
        new_hash = generate_password_hash(test_password, method='scrypt')
        print(f'\nNew hash (first 50 chars): {new_hash[:50]}...')
        print(f'New hash length: {len(new_hash)}')
        new_result = check_password_hash(new_hash, test_password)
        print(f'New hash check: {new_result}')
        
        # Update user with new hash
        print(f'\nUpdating user password...')
        user.password_hash = new_hash
        db.session.commit()
        print('Password updated!')
        
        # Verify again
        user = User.query.filter_by(email='test@example.com').first()
        final_result = user.check_password(test_password)
        print(f'Final verification: {final_result}')
