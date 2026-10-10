import pytest
from app.models.user import User


def test_create_customer_user_defaults():
    """Test user creation with default role."""
    user = User(name='Dining Guest', email='guest@example.com', password='securepassword123')
    assert user.name == 'Dining Guest'
    assert user.email == 'guest@example.com'
    assert user.role == 'customer'
    assert user.check_password('securepassword123') is True
    assert user.check_password('wrongpassword') is False


def test_create_valid_staff_roles():
    """Test user creation with valid staff roles."""
    roles = ['manager', 'host', 'floor_staff', 'customer']
    for role in roles:
        user = User(name=f'{role} name', email=f'{role}@example.com', role=role, password='password123')
        assert user.role == role


def test_invalid_role_initialization_raises_error():
    """Test that instantiating a user with an unknown role raises a ValueError."""
    with pytest.raises(ValueError) as excinfo:
        User(name='Hacker', email='hacker@example.com', role='superadmin', password='password123')
    assert 'Invalid role \'superadmin\'' in str(excinfo.value)


def test_user_to_dict_excludes_password():
    """Test safe dict serialization of a user model does not expose passwords."""
    user = User(name='Elena Vance', email='manager@occupie.local', role='manager', password='strongpassword')
    user.id = 1
    user_dict = user.to_dict()

    assert user_dict['name'] == 'Elena Vance'
    assert user_dict['email'] == 'manager@occupie.local'
    assert user_dict['role'] == 'manager'
    assert user_dict['id'] == 1
    assert 'password' not in user_dict
    assert 'password_hash' not in user_dict


def test_invalid_short_password_raises_error():
    """Test that passwords under 6 characters raise a ValueError."""
    with pytest.raises(ValueError) as excinfo:
        User(name='Short Password', email='short@example.com', password='123')
    assert 'Password must be at least 6 characters' in str(excinfo.value)
