# Occupie Architecture

## Stack and request flow

Occupie uses React, Vite, Tailwind CSS, and React Router in the browser, with Flask, Flask-CORS, SQLAlchemy, and Flask-Migrate on the server. PostgreSQL is the deployment database; development and default tests can use SQLite.

```text
React route → role dashboard → useOperationalData → apiService
                                         ↓ credentialed requests + CSRF header
Flask /api/auth and /api/v1 → JWT cookie validation → membership/ownership checks
                                         ↓
                           SQLAlchemy → PostgreSQL or local SQLite
```

`frontend/src/services/api.js` sends HTTP-only cookie sessions with credentialed requests, reads the separate CSRF cookie for mutating requests, and attempts refresh after an expired access token. `useRole.jsx` restores the user from the server; in API mode, the browser does not select or store an operational role. The explicit demo mode keeps fixture data for previews.

## Authentication and authorization

- Public signup creates a customer only and requires email verification before login.
- Passwords are hashed with Werkzeug's scrypt implementation. Reset and verification tokens are random, expiring, and stored as SHA-256 hashes.
- Access and refresh JWTs are HTTP-only, SameSite=Lax cookies. Mutating cookie-authenticated routes require the matching CSRF token header.
- Logout revokes both token IDs. Password reset increments `auth_version`, invalidating existing sessions.
- Login, registration, verification, and reset endpoints have Flask-Limiter rules. Production requires shared rate-limit storage.
- Staff roles are restaurant memberships, provisioned from the trusted `flask provision-staff` CLI. Public signup cannot assign those roles.
- Every operations request requires an authenticated user and checks the selected restaurant membership. Customer reservation lists and changes are scoped to that customer; staff roles have operation-specific permissions.

## Models and migrations

The SQLAlchemy models live in `backend/app/models/`:

- `User`: password hash, email verification/reset state, and session version.
- `Restaurant` and `RestaurantMembership`: tenant ownership and staff role assignment.
- `RestaurantTable`: capacity, section, occupancy, and server assignment.
- `Reservation`: guest, time, customer owner, table assignment, preference, and status.
- `WaitlistEntry`: walk-in queue, creator, time, optional table assignment, and status.
- `RevokedToken`: invalidated JWT IDs and their expiry.

The initial Alembic revision creates a fresh schema and upgrades the original local schema without dropping its records. Use `flask db upgrade` for schema setup and rollout. Development `create_all()` is retained only as an empty-database convenience.

## Operations and allocation

The versioned API routes are in `backend/app/routes/operations.py`; deterministic allocation rules are in `backend/app/services/allocation.py`. The allocator selects the smallest suitable available table, uses section as a preference, and protects confirmed/checked-in reservations for the 90-minute window. Reservation creation locks candidate table rows in PostgreSQL before checking conflicts and assigning a table. SQLite ignores row locks, so concurrency guarantees require PostgreSQL.

Occupancy, reservation status, and waitlist seating are validated on the backend. Waitlist seating chooses the oldest party that currently has a suitable table. No wait-time prediction is returned when the app lacks validated turnover data.

## Existing routes

The four dashboard routes remain under `/dashboard/manager`, `/dashboard/host`, `/dashboard/floor-staff`, and `/dashboard/customer`. The older health route remains available at `/api/health`; the versioned health route and protected operations are under `/api/v1`.

See [SETUP.md](SETUP.md) for local and production configuration, and [API_CONTRACT.md](API_CONTRACT.md) for endpoint details.
