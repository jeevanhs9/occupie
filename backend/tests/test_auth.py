import pytest
from app.models import User

def test_register(client):
    """Test user registration."""
    response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    assert User.query.filter_by(email="test@example.com").first() is not None

def test_register_invalid_email(client):
    """Test registration with invalid email."""
    response = client.post('/api/auth/register', json={
        "email": "invalidemail",
        "password": "password123"
    })
    assert response.status_code == 400

def test_login_success(client):
    """Test login with correct credentials."""
    client.post('/api/auth/register', json={
        "email": "login@example.com",
        "password": "password123"
    })
    response = client.post('/api/auth/login', json={
        "email": "login@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.get_json()
    assert response.get_json()["user"]["email"] == "login@example.com"

def test_login_invalid(client):
    """Test login with wrong password."""
    client.post('/api/auth/register', json={
        "email": "login@example.com",
        "password": "password123"
    })
    response = client.post('/api/auth/login', json={
        "email": "login@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_me_protected(client):
    """Test access to /me with valid token."""
    client.post('/api/auth/register', json={
        "email": "me@example.com",
        "password": "password123"
    })
    login_res = client.post('/api/auth/login', json={
        "email": "me@example.com",
        "password": "password123"
    })
    token = login_res.get_json()["access_token"]

    response = client.get('/api/auth/me', headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    assert response.get_json()["email"] == "me@example.com"

def test_me_unauthorized(client):
    """Test access to /me without token."""
    response = client.get('/api/auth/me')
    assert response.status_code == 401
