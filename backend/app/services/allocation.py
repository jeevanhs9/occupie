from datetime import datetime, timedelta
from app.models import RestaurantTable, Reservation
from app.extensions import db

def is_table_available(table_id, start_time, end_time):
    # Check for any overlapping reservation
    overlapping = Reservation.query.filter(
        Reservation.table_id == table_id,
        Reservation.start_time < end_time,
        Reservation.end_time > start_time,
        Reservation.status.in_(['confirmed', 'seated'])
    ).first()
    return overlapping is None

def recommend_table(party_size, start_time, duration_minutes):
    end_time = start_time + timedelta(minutes=duration_minutes)

    # 1. First-fit: Find tables with sufficient capacity
    candidate_tables = RestaurantTable.query.filter(RestaurantTable.capacity >= party_size).all()

    # 2. Filter by availability
    for table in candidate_tables:
        if is_table_available(table.id, start_time, end_time):
            return {
                "table_id": table.id,
                "table_number": table.table_number,
                "reason": "Capacity sufficient and table available."
            }

    return None
