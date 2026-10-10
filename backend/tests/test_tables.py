import pytest
from app.models import Restaurant, RestaurantTable
from app.extensions import db

def test_list_tables(client):
    res = Restaurant(name="Test Rest", address="123 St")
    db.session.add(res)
    db.session.commit()

    table = RestaurantTable(restaurant_id=res.id, table_number="T1", capacity=4)
    db.session.add(table)
    db.session.commit()

    response = client.get('/api/tables/')
    assert response.status_code == 200
    assert len(response.get_json()) == 1
