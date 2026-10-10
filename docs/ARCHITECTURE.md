# Occupie architecture (current code audit)

**Audited:** 2026-10-11. This document describes the checked-in application code, not planned features. On Windows, `architecture.md` and the existing tracked `ARCHITECTURE.md` resolve to the same file.

## Stack and request flow

The browser application uses React 18, Vite, Tailwind CSS, and React Router 6. The API uses Flask 3, Flask-CORS, Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, and Flask-Limiter. Development defaults to SQLite; `DATABASE_URL` selects PostgreSQL, which is required by the production configuration.

```mermaid
flowchart LR
  Browser[React routes and shared dashboard layout]
  State[useRole and useOperationalData]
  Client[services/api.js]
  Auth[Flask /api/auth]
  Ops[Flask /api/v1]
  Middleware[JWT, CSRF, tenant and role checks]
  Models[SQLAlchemy models]
  DB[(SQLite locally or PostgreSQL)]

  Browser --> State --> Client
  Client -->|credentialed requests| Auth
  Client -->|credentialed requests| Ops
  Auth --> Middleware
  Ops --> Middleware --> Models --> DB
```

The frontend API client uses a short-lived HTTP-only JWT access cookie, sends the companion CSRF cookie in `X-CSRF-TOKEN` for writes, and returns 401 responses without a refresh attempt. `useRole` restores the current user through `/api/auth/me`. In local development, Vite proxies `/api/*` to Flask at `127.0.0.1:5000` so the browser uses a same-origin API URL. Operational dashboards use `useOperationalData` to load tables, reservations, and waitlist entries in parallel. Explicit development demo mode uses `mockData.js`; production builds always use API mode.

## Frontend responsibilities and modules

| Boundary | Current responsibility | Main files |
|---|---|---|
| App composition and routes | Browser router, role context, public/auth routes, dashboard routes, client-side role gates | `frontend/src/App.jsx`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/hooks/useRole.jsx` |
| Shared workspace shell | Sidebar navigation, top bar, mobile sidebar, hash-anchor scrolling, demo-only role switcher | `frontend/src/components/layout/` |
| Reusable UI | Cards, inputs, buttons, badges, empty states, page entrance and status display | `frontend/src/components/ui/`, `frontend/src/components/common/` |
| API and operations state | Cookie/CSRF fetch wrapper, auth and operational endpoint methods, dashboard data refresh and mutations | `frontend/src/services/api.js`, `frontend/src/hooks/useOperationalData.jsx` |
| Allocation rules | API mode uses the server allocator for customer, host, and manager recommendations; demo mode uses local fixtures/helpers. Seating mutations are rechecked by the API. | `frontend/src/services/allocation.js`, `backend/app/services/allocation.py`, `backend/app/services/adaptive_allocation.py` |
| Role workspaces | Manager, host, floor staff, and customer screens | `frontend/src/pages/dashboards/{manager,host,floor-staff,customer}/` |
| Public and account pages | Landing page, login, customer registration and demo role selection | `frontend/src/pages/landing/`, `frontend/src/pages/auth/` |

The landing page's floor-plan illustration uses fixture data. Fixture data in the landing story is presentation-only; operational API mode reports live API failures and does not silently switch to mock success.

## Route and layout model

`AppRoutes.jsx` defines the public, account, and `/dashboard/*` routes. All dashboard routes share `DashboardLayout`, which contains `RoleSwitcherBanner`, `Sidebar`, and `Topbar`, then renders the selected page through a React Router `Outlet`. Manager, host, floor staff, and customer pages are separate modules. The customer booking, upcoming, and history URLs reuse `CustomerDashboard` with a page prop.

`DashboardAccess` waits for session restoration, sends signed-out users to `/auth/login`, and redirects authenticated users who visit a different role's route to the route associated with their server-reported role. `DashboardIndexRedirect` sends an authenticated user to that role's workspace. These browser checks improve navigation but are not a security boundary: Flask independently enforces authentication, restaurant membership, operation role, and customer ownership. Only the explicit local demo mode bypasses the role match at the client gate; the demo role selector is itself hidden in API mode.

See [sitemap.md](sitemap.md) for every route and sidebar destination.

## Authentication and authorization

`backend/app/routes/auth.py` exposes public customer registration and login, access-cookie logout and current-user restoration, plus a public restaurant list. Passwords use Werkzeug scrypt hashes. A short-lived access JWT is set in an HTTP-only cookie; a separate CSRF cookie is echoed in `X-CSRF-TOKEN` for state-changing requests. Logout revokes that access token through `revoked_tokens`. Verification, password recovery, and refresh-token endpoints are not registered. Their historical database columns remain mapped so the existing schema and rows can be preserved without a cleanup migration.

Operational requests in `backend/app/routes/operations.py` require an access JWT. The server resolves a restaurant from `X-Restaurant-ID`, `restaurant_id`, JSON `restaurantId`, or `DEFAULT_RESTAURANT_ID`; it then resolves staff roles from `RestaurantMembership`. A user without a matching staff membership is treated as a customer. Customer reservation and waitlist records are constrained to the signed-in user. Public registration cannot assign staff membership; `flask provision-staff` is the trusted provisioning path.

The backend supports restaurant selection, but the current browser client sends no restaurant selector and the shared sidebar displays a hardcoded restaurant name. In practice, normal UI requests use the configured default restaurant. `/api/auth/restaurants` is public, but no current page consumes it as a tenant picker.

## Backend feature boundaries

| Boundary | Responsibility | Main files |
|---|---|---|
| App and configuration | Flask factory, extension setup, CORS, error/JWT handlers, development schema convenience, staff provisioning CLI | `backend/app/__init__.py`, `backend/app/config.py`, `backend/run.py` |
| Auth and request protection | Auth endpoints, JWT cookie behavior, CSRF, role decorator | `backend/app/routes/auth.py`, `backend/app/middleware/auth.py` |
| Operational REST API | Tenant resolution, permissions, validation, allocation recheck, state updates and audit writes | `backend/app/routes/operations.py` |
| Allocation rules | Deterministic single-table fit and reservation hold-window rules | `backend/app/services/allocation.py` |
| Models | User, restaurant/membership, table, reservation, waitlist, revoked token and audit event | `backend/app/models/` |
| Schema history | Alembic revisions for original-schema upgrade, membership backfill, audit events, constraint cleanup, duplicate booking constraint | `backend/migrations/versions/` |

`backend/app/__init__.py` registers the operational blueprint at `/api/v1`, auth at `/api/auth`, and the health blueprint at both `/api` and `/api/v1`. The older, unregistered route modules were removed during the cleanup documented in [`CLEANUP_REPORT.md`](CLEANUP_REPORT.md); the registered operations routes remain the current public API contract.

## Database model and relationships

| Model | Stored data and links |
|---|---|
| `User` | Unique email, scrypt password hash, legacy/base role, historical verification/reset columns, and `auth_version`. Historical columns are retained for compatibility but are not read or written by the simplified auth routes. IDs are referenced by reservations, waitlist creators, memberships, audit actors, and revoked-token validation. |
| `Restaurant` | Tenant ID/name and allocation version used to serialize allocation writes. Parent tenant referenced by memberships, settings, tables, reservations, waitlist rows, reassignment requests, and audit events. |
| `RestaurantSettings` | Persisted turn time, reservation hold, no-show grace, and utilization target. Defaults apply if no row exists yet. |
| `RestaurantMembership` | Composite `(user_id, restaurant_id)` key and staff role restricted to manager, host, or floor staff. |
| `RestaurantTable` | Tenant-scoped capacity, section, status, assigned server, current party size, and seating timestamp. |
| `Reservation` | Tenant, optional customer owner, guest details, party size, UTC start, optional table, status, notes/preferences, and seated/completed timestamps. Statuses are confirmed, checked-in, seated, completed, cancelled, or no-show. A partial unique index prevents a customer's duplicate active booking for the same restaurant and timestamp. |
| `ReservationReassignment` | Host/manager table-change request, requested target, decision, actor IDs, reason, and timestamps; manager approval rechecks availability. |
| `WaitlistEntry` | Tenant, optional creator, party/contact, status, creation time, and optional table. SQLAlchemy links it to the table. |
| `RevokedToken` | Revoked JWT ID and expiry. |
| `AuditEvent` | Tenant, optional actor, entity/action, JSON details, timestamp. Mutating operational endpoints record relevant table, reservation, and waitlist events. |

Current status values are `available`, `occupied`, `reserved`, `cleaning` for tables; `confirmed`, `checked_in`, `seated`, `completed`, `cancelled`, `no_show` for reservations; and `waiting`, `ready`, `seated`, `cancelled` for waitlist entries. The allowed table state transitions are enforced by the operations API. Floor-staff rows/actions are scoped to tables whose free-form `assigned_server` exactly matches the authenticated user's display name.

Migrations are present through `a6b7c8d9e012`. The two latest revisions add operating settings/lifecycle timestamps and reassignment requests. Fresh and populated SQLite migrations passed in scratch databases. The default local SQLite database was subsequently backed up and migrated from `e880f4e1dce4` to this head; other intended databases still need their own backup and upgrade. Production PostgreSQL migration behavior was not tested.

## Current operational limits

- Allocation chooses one available table with enough seats, preferring the requested section and then the smallest sufficient capacity; combining tables is not implemented. API-mode host and manager queue recommendations use the server allocator.
- Confirmed, checked-in, and seated reservations are considered against overlapping booking and proposed dining intervals using per-restaurant hold/turn settings. Occupied and cleaning tables are not recommendations; a requested reservation table is rechecked at save/seating time.
- A restaurant-level allocation version coordinates operational writes. A parallel SQLite reservation test passed, but SQLite does not prove PostgreSQL locking behavior; production database concurrency remains untested.
- The manager has a current-state report, API CSV export, insert-only table CSV import, and non-persistent what-if simulation. The shift report is not date-filtered historical analytics. Recorded average turn duration uses completed reservations with both timestamps; revenue is not stored. Allocation's revenue-opportunity factor is heuristic.
- No occupied-table turnover prediction, automatic no-show job, notification push, or reliable wait estimate exists. Queue age is elapsed time. API data refreshes on page load and after actions; there is no live operational push channel.
- Frontend restaurant selection is absent; ordinary requests use the configured default tenant. Floor assignment is a free-form exact display-name match, not an identity foreign key.

See [workflows.md](workflows.md) and [api-contract.md](api-contract.md) for the verified flow and route details.
