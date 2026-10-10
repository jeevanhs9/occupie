# Occupie Architecture

## Scope

The current project is a hackathon-ready demo with two data modes:

- **Demo mode** is the default. React pages use labeled in-memory fixtures; edits disappear after reload.
- **API mode** (`VITE_DATA_MODE=api`) loads and mutates persisted Flask data. API errors remain visible and do not fall back to fixtures.

Role selection is for preview only. The backend currently has no login, token issuance, or role authorization.

## Request and data flow

```text
React route → role dashboard → useOperationalData → apiService → Flask /api/v1
                        ↘ demo fixtures + deterministic browser preview rules
Flask route → validation → allocation service (where needed) → SQLAlchemy models → SQLite/PostgreSQL
```

The frontend uses `src/services/api.js` for URL construction, JSON requests, and consistent failure results. `src/hooks/useOperationalData.jsx` selects the configured source and owns page-level operational state. A failed API request is not treated as success and does not switch modes.

The Flask factory in `backend/app/__init__.py` configures SQLAlchemy, Flask-Migrate, JWT foundation, CORS, error handlers, and versioned blueprints. Operational endpoints are in `app/routes/operations.py`. Domain behavior lives in `app/services/allocation.py`; models are under `app/models/`.

## Models

- `User`: hashed-password and role foundation; no auth endpoints use it yet.
- `RestaurantTable`: capacity, section, current status, seated party, and server assignment.
- `Reservation`: guest, party size, start time, table assignment, preference, and lifecycle status.
- `WaitlistEntry`: walk-in party, status, enqueue time, and optional assigned table.

`run.py` calls `db.create_all()` for development. This creates missing tables but does not migrate existing schemas. Flask-Migrate is installed; the initial Alembic migration still needs to be generated and reviewed before production.

## Allocation rule

The current rule is small and deterministic:

1. Filter to tables with `available` status and capacity at least the party size.
2. Exclude tables whose confirmed or checked-in reservation overlaps the party's 90-minute protection window.
3. Prefer the requested section if it has an eligible table.
4. Choose the table with the least unused capacity, then table ID for stable tie-breaking.
5. When seating a waitlist, consider entries in arrival order and seat the first party with an eligible table; an older party that cannot fit does not block a smaller party.

This strategy does not combine tables, forecast clear times, optimize an entire shift, or promise waiting times. Reservation protection defaults to 90 minutes on either side of the requested seating time.

## API mode and persistence

The database URL comes from backend environment config. Development uses local SQLite if `DATABASE_URL` is blank and PostgreSQL if set. Tests use in-memory SQLite. The frontend API base URL comes from `VITE_API_BASE_URL`.

Implemented API resources:

- `/health`
- `/tables` and table status updates
- `/reservations` and reservation lifecycle updates
- `/waitlist` and waitlist seating/status updates
- `/allocations/recommend`

See [API_CONTRACT.md](API_CONTRACT.md) for schemas and validation.

## Security boundary

CORS limits browser origins; it is not authentication. Dashboard roles, the login preview, and role switcher are client-side only. The API endpoints currently allow unauthenticated operations and are suitable for local demos, not public deployment. Production configuration refuses to start without a Flask secret, JWT secret, and database URL, but real JWT authorization still needs implementation.

## Planned work

1. Add reviewed database migrations and production WSGI deployment configuration.
2. Implement authentication and server-enforced restaurant/role permissions.
3. Add analytics, historical turnover, and revenue only when supported by persisted source data.
4. Add realtime update delivery and notifications if required by restaurant operations.
5. Improve allocation with service-duration and multi-table rules, then validate the results against restaurant data.
