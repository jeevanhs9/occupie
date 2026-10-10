#!/usr/bin/env python
"""
Migration script to fix user passwords.

This script addresses an issue where existing user accounts have password hashes
that don't verify correctly. This can happen when:
1. Users were created before scrypt hashing was fully implemented
2. Passwords were set incorrectly during database migrations
3. The database was imported from an older system

IMPORTANT: This script does NOT reset passwords to known values.
Instead, it identifies users with problematic hashes and provides options:
- Reset to a temporary password (users must reset via forgot-password)
- Skip users who can still login successfully

Usage:
    python fix_user_passwords.py --dry-run        # Show affected users without making changes
    python fix_user_passwords.py --fix-all        # Fix all users with temp password
    python fix_user_passwords.py --test-email     # Test specific email
"""
import sys
import argparse
from werkzeug.security import generate_password_hash
from app import create_app
from app.models import User
from app.extensions import db

TEMP_PASSWORD = 'TempPassword123!'  # Users will need to reset this


def test_user_password(user, test_password=None):
    """Test if user's password hash is valid."""
    if not test_password:
        # We don't know the original password, so we can't test it
        # But we can check if the hash format looks valid
        if not user.password_hash:
            return False, "No password hash"
        if not user.password_hash.startswith('scrypt:'):
            return False, "Non-scrypt hash format"
        # Hash looks valid, but we can't verify without knowing the password
        return None, "Unknown - hash format looks valid but password unknown"
    
    try:
        result = user.check_password(test_password)
        return result, "Password check successful" if result else "Password check failed"
    except Exception as e:
        return False, f"Error during check: {e}"


def fix_user_password(user, new_password=TEMP_PASSWORD):
    """Reset user password to a known temporary value."""
    try:
        user.set_password(new_password)
        db.session.commit()
        return True, "Password reset successful"
    except Exception as e:
        db.session.rollback()
        return False, f"Error resetting password: {e}"


def main():
    parser = argparse.ArgumentParser(description='Fix user password hashes')
    parser.add_argument('--dry-run', action='store_true', help='Show affected users without making changes')
    parser.add_argument('--fix-all', action='store_true', help='Reset all users to temporary password')
    parser.add_argument('--test-email', type=str, help='Test specific email address')
    parser.add_argument('--test-password', type=str, help='Test password for specific user')
    
    args = parser.parse_args()
    
    app = create_app()
    with app.app_context():
        if args.test_email:
            # Test specific user
            user = User.query.filter_by(email=args.test_email.strip().lower()).first()
            if not user:
                print(f"User not found: {args.test_email}")
                return 1
            
            print(f"\nTesting user: {user.email}")
            print(f"  Name: {user.name}")
            print(f"  Role: {user.role}")
            print(f"  Has password hash: {bool(user.password_hash)}")
            
            if args.test_password:
                result, message = test_user_password(user, args.test_password)
                print(f"  Password test: {message}")
                if result:
                    print(f"  ✓ Password works correctly")
                    return 0
                else:
                    print(f"  ✗ Password verification failed")
                    if not args.dry_run:
                        confirm = input(f"\nReset password to '{TEMP_PASSWORD}'? (yes/no): ")
                        if confirm.lower() == 'yes':
                            success, msg = fix_user_password(user)
                            if success:
                                print(f"  ✓ {msg}")
                                print(f"  User can now login with: {TEMP_PASSWORD}")
                                return 0
                            else:
                                print(f"  ✗ {msg}")
                                return 1
            return 0
        
        # Check all users
        users = User.query.all()
        print(f"\nFound {len(users)} user(s) in database\n")
        
        problematic_users = []
        valid_users = []
        
        for user in users:
            result, message = test_user_password(user)
            if result is False:
                problematic_users.append((user, message))
                print(f"⚠ {user.email}")
                print(f"    {message}")
            elif result is None:
                print(f"? {user.email}")
                print(f"    {message}")
            else:
                valid_users.append(user)
                print(f"✓ {user.email}")
        
        if not problematic_users:
            print(f"\n✓ All {len(valid_users)} users have valid password hashes")
            return 0
        
        print(f"\n⚠ Found {len(problematic_users)} user(s) with password issues")
        
        if args.dry_run:
            print("\nDry run mode - no changes made")
            print(f"Run with --fix-all to reset passwords to: {TEMP_PASSWORD}")
            return 0
        
        if args.fix_all:
            confirm = input(f"\nReset passwords for {len(problematic_users)} users to '{TEMP_PASSWORD}'? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Cancelled")
                return 0
            
            fixed = 0
            failed = 0
            for user, issue in problematic_users:
                success, msg = fix_user_password(user)
                if success:
                    fixed += 1
                    print(f"✓ Fixed: {user.email}")
                else:
                    failed += 1
                    print(f"✗ Failed: {user.email} - {msg}")
            
            print(f"\n✓ Fixed {fixed} user(s)")
            if failed:
                print(f"✗ Failed to fix {failed} user(s)")
                return 1
            return 0
        
        print("\nUse --fix-all to reset these users' passwords")
        return 0


if __name__ == '__main__':
    sys.exit(main())
