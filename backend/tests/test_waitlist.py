import pytest
from app.models import WaitlistEntry, Restaurant, User
from app.extensions import db

def test_waitlist(client):
    # Register/Login user to get token
    client.post('/api/auth/register', json={
        "email": "waitlist@test.com",
        "password": "Password_123"
    })
    login_res = client.post('/api/auth/login', json={
        "email": "waitlist@test.com",
        "password": "Password_123"
    })
    token = login_res.get_json()["access_token"]

    # Create restaurant
    res = Restaurant(name="Rest1", address="Addr1")
    db.session.add(res)
    db.session.commit()

    # Access protected route
    response = client.post('/api/waitlist/', json={
        "restaurant_id": res.id,
        "party_size": 2
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201

    response = client.get('/api/waitlist/', headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert len(response.get_json()) == 1
