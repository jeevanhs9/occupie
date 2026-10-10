"""Add the documented demo accounts and operational records without deleting data.

Run migrations first, then execute this file from ``backend``. The script is
safe to repeat: it inserts missing demo records, leaves existing rows alone,
and stops if a demo login already exists with different credentials.
"""

from datetime import datetime, timedelta, timezone

from werkzeug.security import generate_password_hash

from app import create_app, db
from app.models import (
    Restaurant,
    RestaurantMembership,
    RestaurantTable,
    Reservation,
    User,
    WaitlistEntry,
)


STAFF = (
    ("Demo Manager", "manager@goldenfork.com", "manager", "Manager123!"),
    ("Demo Host", "host@goldenfork.com", "host", "Host123!"),
    ("Demo Floor Staff", "staff@goldenfork.com", "floor_staff", "Staff123!"),
)

CUSTOMERS = (
    ("Sarah Johnson", "sarah.johnson@email.com"),
    ("Michael Chen", "michael.chen@email.com"),
    ("Emily Rodriguez", "emily.rodriguez@email.com"),
    ("David Martinez", "david.martinez@email.com"),
    ("Lisa Wang", "lisa.wang@email.com"),
    ("James Brown", "james.brown@email.com"),
    ("Robert Taylor", "robert.taylor@email.com"),
    ("Jennifer Lee", "jennifer.lee@email.com"),
    ("William Davis", "william.davis@email.com"),
)

TABLES = (
    ("DEMO-T1", "T1", 2, "Window", "available", None, 0),
    ("DEMO-T2", "T2", 2, "Window", "available", None, 0),
    ("DEMO-T3", "T3", 4, "Main Floor", "available", None, 0),
    ("DEMO-T4", "T4", 4, "Main Floor", "occupied", "Demo Floor Staff", 2),
    ("DEMO-T5", "T5", 4, "Patio", "available", None, 0),
    ("DEMO-T6", "T6", 6, "Main Floor", "reserved", None, 0),
    ("DEMO-T7", "T7", 6, "Private", "available", None, 0),
    ("DEMO-T8", "T8", 8, "Main Floor", "available", None, 0),
    ("DEMO-T9", "T9", 2, "Bar Area", "available", None, 0),
    ("DEMO-T10", "T10", 4, "Bar Area", "available", None, 0),
    ("DEMO-T11", "T11", 6, "Patio", "cleaning", "Demo Floor Staff", 0),
    ("DEMO-T12", "T12", 8, "Private", "available", None, 0),
)


def _ensure_user(name, email, role, password):
    user = User.query.filter_by(email=email).first()
    if user:
        if user.role != role or not user.check_password(password):
            raise ValueError(
                f"{email} already exists with different credentials or role; "
                "the existing account was not changed."
            )
        return user, False

    user = User(name=name, email=email, role=role)
    # These are deliberately simple, local-only demo credentials documented
    # in README.md; public registration still enforces its password policy.
    user.password_hash = generate_password_hash(password)
    db.session.add(user)
    db.session.flush()
    return user, True


def _existing_in_restaurant(model, record_id, restaurant_id):
    record = db.session.get(model, record_id)
    if record and record.restaurant_id != restaurant_id:
        raise ValueError(
            f"Demo identifier {record_id} is already used by another restaurant; "
            "no existing row was changed."
        )
    return record


def seed_demo_data():
    app = create_app()
    with app.app_context():
        restaurant_id = app.config["DEFAULT_RESTAURANT_ID"]
        restaurant = db.session.get(Restaurant, restaurant_id)
        if restaurant is None:
            restaurant = Restaurant(id=restaurant_id, name="The Golden Fork")
            db.session.add(restaurant)
            db.session.flush()

        inserted = {"users": 0, "tables": 0, "reservations": 0, "waitlist": 0}
        staff_by_role = {}
        for name, email, role, password in STAFF:
            user, was_created = _ensure_user(name, email, role, password)
            inserted["users"] += int(was_created)
            staff_by_role[role] = user
            membership = RestaurantMembership.query.filter_by(
                user_id=user.id, restaurant_id=restaurant_id
            ).first()
            if membership and membership.role != role:
                raise ValueError(
                    f"{email} has a different role at {restaurant_id}; "
                    "the existing membership was not changed."
                )
            if membership is None:
                db.session.add(RestaurantMembership(
                    user_id=user.id,
                    restaurant_id=restaurant_id,
                    role=role,
                ))

        customers_by_email = {}
        for name, email in CUSTOMERS:
            user, was_created = _ensure_user(name, email, "customer", "Customer123!")
            inserted["users"] += int(was_created)
            customers_by_email[email] = user

        now = datetime.now(timezone.utc)
        for table_id, name, capacity, section, status, assigned_server, party_size in TABLES:
            if _existing_in_restaurant(RestaurantTable, table_id, restaurant_id):
                continue
            db.session.add(RestaurantTable(
                id=table_id,
                restaurant_id=restaurant_id,
                name=name,
                capacity=capacity,
                section=section,
                status=status,
                assigned_server=assigned_server,
                party_size=party_size,
                time_seated=now - timedelta(minutes=24) if status == "occupied" else None,
            ))
            inserted["tables"] += 1

        db.session.flush()
        reservation_rows = (
            ("DEMO-RES-01", "david.martinez@email.com", -12, 4, "DEMO-T3", "completed"),
            ("DEMO-RES-02", "lisa.wang@email.com", -10, 2, "DEMO-T1", "completed"),
            ("DEMO-RES-03", "james.brown@email.com", -8, 6, "DEMO-T7", "completed"),
            ("DEMO-RES-04", "sarah.johnson@email.com", 2, 4, "DEMO-T6", "confirmed"),
            ("DEMO-RES-05", "robert.taylor@email.com", 3, 2, "DEMO-T9", "confirmed"),
            ("DEMO-RES-06", "jennifer.lee@email.com", 4, 4, "DEMO-T5", "confirmed"),
            ("DEMO-RES-07", "william.davis@email.com", 5, 8, "DEMO-T12", "confirmed"),
            ("DEMO-RES-08", "emily.rodriguez@email.com", 28, 2, "DEMO-T2", "confirmed"),
        )
        base_time = now.replace(minute=0, second=0, microsecond=0)
        for reservation_id, email, hour_offset, party_size, table_id, status in reservation_rows:
            if _existing_in_restaurant(Reservation, reservation_id, restaurant_id):
                continue
            customer = customers_by_email[email]
            starts_at = base_time + timedelta(hours=hour_offset)
            db.session.add(Reservation(
                id=reservation_id,
                restaurant_id=restaurant_id,
                customer_id=customer.id,
                guest_name=customer.name,
                party_size=party_size,
                starts_at=starts_at,
                table_id=table_id,
                status=status,
                seated_at=starts_at + timedelta(minutes=5) if status in {"seated", "completed"} else None,
                completed_at=starts_at + timedelta(minutes=90) if status == "completed" else None,
            ))
            inserted["reservations"] += 1

        waitlist_rows = (
            ("DEMO-WL-01", "Amanda Wilson", "(555) 123-4567", 2, 15),
            ("DEMO-WL-02", "Christopher Moore", "(555) 234-5678", 4, 25),
            ("DEMO-WL-03", "Patricia Garcia", "(555) 345-6789", 6, 35),
        )
        for entry_id, name, contact, party_size, wait_minutes in waitlist_rows:
            if _existing_in_restaurant(WaitlistEntry, entry_id, restaurant_id):
                continue
            db.session.add(WaitlistEntry(
                id=entry_id,
                restaurant_id=restaurant_id,
                created_by_id=staff_by_role["manager"].id,
                party_name=name,
                party_size=party_size,
                contact=contact,
                status="waiting",
                created_at=now - timedelta(minutes=wait_minutes),
            ))
            inserted["waitlist"] += 1

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        print(f"Demo data is ready for {restaurant.name} ({restaurant_id}).")
        print("Rows inserted (existing rows were left unchanged):")
        for entity, count in inserted.items():
            print(f"  {entity}: {count}")
        print("Staff: manager@goldenfork.com, host@goldenfork.com, staff@goldenfork.com")
        print("Customer: sarah.johnson@email.com (all customer accounts use Customer123!)")


if __name__ == "__main__":
    try:
        seed_demo_data()
    except Exception as exc:
        raise SystemExit(f"Demo seed failed without committing changes: {exc}") from exc
