from datetime import datetime, timedelta
from app.models import RestaurantTable, Reservation
from app.extensions import db

def is_table_available(table_id, start_time, end_time):
    # Check for any overlapping reservation that includes this table
    overlapping = Reservation.query.join(Reservation.tables).filter(
        RestaurantTable.id == table_id,
        Reservation.start_time < end_time,
        Reservation.end_time > start_time,
        Reservation.status.in_(['confirmed', 'seated'])
    ).first()
    return overlapping is None

def recommend_table(party_size, start_time, duration_minutes):
    end_time = start_time + timedelta(minutes=duration_minutes)

# 1. Best-Fit: Find tables that fit, sorted by capacity ascending
    candidate_tables = RestaurantTable.query.filter(
        RestaurantTable.capacity >= party_size,
        RestaurantTable.status == 'available'
    ).order_by(RestaurantTable.capacity.asc()).all()

    # 2. Filter by availability
    for table in candidate_tables:
        if is_table_available(table.id, start_time, end_time):
            return {
                "table_id": table.id,
                "table_number": table.table_number,
                "reason": "Capacity sufficient and table available."
            }

    return None
