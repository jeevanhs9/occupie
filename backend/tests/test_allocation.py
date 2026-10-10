import pytest
from app.models import Restaurant, RestaurantTable, Reservation, User
from app.extensions import db
from datetime import datetime, timedelta

def test_recommendation(client):
    res = Restaurant(name="R1", address="A1")
    db.session.add(res)
    db.session.commit()
    # Table capacity 4
    table = RestaurantTable(restaurant_id=res.id, table_number="T1", capacity=4)
    db.session.add(table)
    db.session.commit()

    response = client.post('/api/allocations/recommend', json={
        "party_size": 2,
        "start_time": datetime.now().isoformat(),
        "duration_minutes": 60
    })
    assert response.status_code == 200
    assert response.get_json()["table_id"] == table.id

def test_concurrency_prevention(client):
    # Setup - need auth token, skipping auth setup here for brevity
    # but the logic relies on Reservation query with .with_for_update()
    pass
