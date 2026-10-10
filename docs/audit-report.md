# Occupie architecture and workflow audit

**Date:** 2026-10-11  
**Scope:** repository inspection and documentation only; no application code, configuration, migrations, or database records were changed.

> **Follow-up:** This report's checklist is the original audit snapshot. Authentication was simplified afterward: the current contract is in [api-contract.md](api-contract.md), local connectivity setup is in [SETUP.md](SETUP.md), and the backend/frontend verification results are recorded in the follow-up section below.

## Authentication and connectivity follow-up

- Authentication now consists of customer registration, login, logout, and `GET /api/auth/me` using a 15-minute HTTP-only access JWT cookie and CSRF protection. Verification, password recovery, and refresh-token endpoints are no longer registered. Legacy columns and migration history remain untouched for compatibility.
- The local frontend API URLs use `/api/v1` and `/api/auth`; Vite proxies `/api/*` to `http://127.0.0.1:5000`. The original “Unable to reach” symptom was reproducible because no process was listening on Flask's configured port. Direct Flask health, Vite-proxied health, and credentialed CORS preflight all returned 200 when both dev servers were running.
- Verification after the follow-up: backend pytest **77 passed**; frontend production build **passed**. The complete frontend Vitest suite had **17 passed, 2 failed**: the landing-page test lacks `IntersectionObserver` in jsdom, and an operations test queries the “Reserve a Table” link as a button.

Nine frontend files already had staged changes when this audit began. Those staged changes were left untouched and remain staged; the build was run against the current working tree, including them.

## Architecture summary

Occupie is a React 18/Vite/Tailwind frontend with React Router 6, backed by a Flask REST API using SQLAlchemy, Flask-Migrate, JWT cookies, and Flask-CORS. Local development falls back to SQLite; production requires PostgreSQL. API mode is the default. The development-only demo mode uses frontend fixtures and a role preview.

Four workspaces are registered under `/dashboard`: manager, host, floor staff, and customer. They share `DashboardLayout` and use role-aware sidebar entries. The browser restores authentication through `/api/auth/me`; Flask resolves staff roles from `RestaurantMembership` and checks role, tenant, and ownership on operational requests. Main operational data flows through one frontend API wrapper and `useOperationalData`; the backend implementation is in the registered `/api/v1` operations blueprint.

Tables, reservations, waitlist entries, memberships, restaurants, token revocation, and operational audit events have SQLAlchemy models and migrations. The allocator chooses one suitable table and protects active reservation holds. See [ARCHITECTURE.md](ARCHITECTURE.md), [sitemap.md](sitemap.md), [workflows.md](workflows.md), and [api-contract.md](api-contract.md).

## Feature status checklist

| Area | Status | Evidence and limits |
|---|---|---|
| Four role workspaces and route guards | **Implemented** | `/dashboard/manager`, `/host`, `/floor-staff`, `/customer` are registered; client gates and API membership checks exist. |
| Database-backed authentication | **Implemented** | Password hashes, JWT access/refresh cookies, CSRF, refresh/revocation, password reset, and staff provisioning are present. |
| Public customer registration | **Implemented with auth-flow mismatch** | Signup creates a customer and immediately marks email verified; verification UI and older docs describe a verification requirement that the current signup path does not use. |
| Restaurant tenant scoping | **Backend implemented; frontend selection missing** | API can select tenant by header/query/body/default, but browser sends no restaurant selector; `/me` resolves role at the default restaurant, and sidebar restaurant label is hardcoded. |
| Table management and occupancy | **Implemented** | Manager creates tables; manager/host/floor staff update statuses; occupied state requires a fitting party and seating metadata is cleared on other states. |
| Capacity matching | **Implemented for one table** | Exact capacity is not required; smallest sufficient available table is selected. Multiple-table combinations are unsupported. |
| Recommendation consistency | **Partial** | Customer booking uses the backend allocator; host/manager suggestion cards use a separate frontend helper that compares time-of-day rather than full dates. Seating is server-validated, but suggestions can disagree across dates. |
| Reservation scheduling | **Implemented** | Customer/host/manager can create future reservations; API stores UTC start and assigns a single table. |
| Reservation conflicts | **Implemented with database caveat** | Availability is rechecked at creation; active reservation holds and duplicate customer/time constraints exist. PostgreSQL row locks are not provided by SQLite. |
| Arrival/check-in and seating | **Implemented manually** | Customer may check in; staff may seat; seating marks table occupied. No arrival event or automatic transition is recorded. |
| Late arrival/no-show | **Partial/manual only** | `no_show` status and staff transition exist; no grace-period rule, reminder, or scheduled update exists. |
| Walk-in/waitlist | **Implemented** | Staff and customers can create entries; customer entries are private and cancellable; host/manager seating prioritizes the oldest serviceable entry. |
| Wait-time prediction | **Missing** | `waitMinutes` is elapsed time; `quotedWait` is always null; allocation does not predict occupied-table turnover. |
| Floor staff service updates | **Partial** | Table status actions work; no separate service-event or assignment-management API is present. |
| Manager analytics/revenue | **Missing as service/API** | Dashboard derives current-state cards; preview values are fixtures; CSV download is browser-generated from loaded records; no historical revenue model or report endpoint. |
| Notifications/live push | **Missing** | SMTP supports account actions; no reservation notification or operational push channel. Customer waitlist and health use polling. |
| Existing tests | **Present; not executed in this docs phase** | Frontend has Vitest/RTL suites for app, API, API mode, allocation, and operations. Backend pytest covers auth, config, health, users, tables, reservations, allocation, operational and customer workflows. |
| Conflict markers/build | **Clean at audit; build passes** | Repository-wide marker scan found no `<<<<<<<`, `=======`, or `>>>>>>>` lines. `npm run build` completed successfully. |

## Important defects, mismatches, and dead or unreachable code

1. **Restaurant selection is not wired through the frontend.** [`api.js`](../frontend/src/services/api.js) has no `X-Restaurant-ID`/tenant context; [`Sidebar.jsx`](../frontend/src/components/layout/Sidebar.jsx) shows a hardcoded restaurant name. The backend supports tenant selection in [`operations.py`](../backend/app/routes/operations.py) and the profile role is resolved in [`auth.py`](../backend/app/routes/auth.py). Until a picker or explicit configuration is added, a user with memberships at multiple restaurants operates against the default tenant in the UI.

2. **Email verification is an orphaned/inconsistent path.** [`auth.py`](../backend/app/routes/auth.py) registration assigns `email_verified_at` and returns “You can now sign in” without issuing a verification token. The verification page copy in [`AuthActionPage.jsx`](../frontend/src/pages/auth/AuthActionPage.jsx) says verification activates the account, while there is no resend UI. Existing [`API_CONTRACT.md`](API_CONTRACT.md) and the former architecture description also said verification is required. The new audited contract records actual behavior; decide the intended product flow before changing auth logic.

3. **No automatic late-arrival behavior.** `no_show` exists as a staff-settable status in [`operations.py`](../backend/app/routes/operations.py), but no scheduler or grace-period policy exists. This means occupied/held tables do not become free merely because a reservation time passed.

4. **Allocation is limited to one table.** [`allocation.py`](../backend/app/services/allocation.py) chooses a single table with sufficient capacity; `Reservation.table_id` in [`reservation.py`](../backend/app/models/reservation.py) stores one assignment. A larger party than any single table receives no recommendation.

5. **Host/manager suggestions can diverge from server allocation.** [`HostDashboard.jsx`](../frontend/src/pages/dashboards/host/HostDashboard.jsx) and [`ManagerDashboard.jsx`](../frontend/src/pages/dashboards/manager/ManagerDashboard.jsx) use the browser helper in [`services/allocation.js`](../frontend/src/services/allocation.js), which compares reservation time-of-day and does not use the full reservation date. The registered API allocator in [`backend/app/services/allocation.py`](../backend/app/services/allocation.py) compares full timestamps. Seating is revalidated on the server, but the UI may recommend a different party/table.

6. **Manager analytics are not backed by reporting data.** [`ManagerDashboard.jsx`](../frontend/src/pages/dashboards/manager/ManagerDashboard.jsx) calculates current-state display values, uses labeled demo values for some metrics, and creates a browser CSV. No analytics/revenue route is registered in [`__init__.py`](../backend/app/__init__.py).

7. **Legacy Flask route modules are unreachable and stale.** [`allocations.py`](../backend/app/routes/allocations.py), [`reservations.py`](../backend/app/routes/reservations.py), and [`tables.py`](../backend/app/routes/tables.py) define older route shapes but are not registered. Their fields/signatures (for example `start_time`, `end_time`, `table_number`, and the older allocation call) do not match current models/services. The active contract is `operations.py`. Keep the older modules until references and compatibility needs have been checked; do not register them as-is or mistake them for live endpoints.

8. **Verification resend is service-only, with no page action.** [`api.js`](../frontend/src/services/api.js) exports `resendVerification`, but [`AuthActionPage.jsx`](../frontend/src/pages/auth/AuthActionPage.jsx) does not call it. It is currently unreachable from the UI.

9. **Some landing animation modules look unreferenced.** `NativeBrandAnimation.jsx` and `OccupieHeroLockup.jsx` have no imports in `frontend/src` outside their own declarations. Treat these as apparent dead candidates only; preserve them until product intent and asset dependencies are checked.

10. **OccupieChat is only mounted on the four root workspace URLs.** [`App.jsx`](../frontend/src/App.jsx) checks exact pathname equality, so `/dashboard/customer/book`, `/dashboard/customer/upcoming`, and `/dashboard/customer/history` do not mount chat. Verify intended placement before changing navigation behavior.

11. **No operational table seed is created for an empty local database.** The app factory creates the configured restaurant in development, but not tables. A new install needs a manager to create table records before reservations can be recommended.

## Repository inventory

### Frontend pages

- Public: `pages/landing/LandingPage.jsx`, `CinematicScene.jsx`, `ProductStory.jsx`, `BrandAnimation.jsx`, `LogoFrameAnimation.jsx`, `NativeBrandAnimation.jsx`, and `OccupieHeroLockup.jsx` (plus the two animation CSS files).
- Auth: `pages/auth/LoginPage.jsx`, `AuthActionPage.jsx`, and demo-only `RoleSelectPage.jsx`.
- Workspaces: `pages/dashboards/manager/ManagerDashboard.jsx`, `host/HostDashboard.jsx`, `floor-staff/FloorStaffDashboard.jsx`, and `customer/CustomerDashboard.jsx` (also used for customer subroutes; host/customer each have a CSS file).

The application shell files are `frontend/src/main.jsx`, `App.jsx`, and `routes/AppRoutes.jsx`.

### Frontend shared modules

- Layout: `DashboardLayout`, `Sidebar`, `Topbar`, `RoleSwitcherBanner`.
- Common/dashboard UI: `Logo`, `OccupieChat`, `OperationalDataStatus`, `FloorPlan`, `RoyalKPICard`, `Badge`, `Button`, `Card`, `EmptyState`, `Input`, `PageEntrance`, and `StatCard`.
- State/services: `useRole`, `useOperationalData`, `constants.js`, `services/api.js`, `services/allocation.js`, `services/mockData.js`.

### Backend routes/models

- Registered routes: health, auth, and operational blueprints. Auth endpoints are listed in [api-contract.md](api-contract.md); registered reservation/table/waitlist/allocation endpoints are in `backend/app/routes/operations.py`.
- Models: `User`, `Restaurant`, `RestaurantMembership`, `RestaurantTable`, `Reservation`, `WaitlistEntry`, `RevokedToken`, `AuditEvent` (declared in `restaurant.py`).
- Services: deterministic table allocation and account-action email. Five Alembic revisions are present: `db6499397870` initial auth/operations and legacy schema migration; `d2945e6b75df` audit events; `a835c178cc21` redundant email constraint removal; `c73b9f8a254e` staff membership backfill; `e880f4e1dce4` active customer booking uniqueness.

### Configuration, startup, and tests

- Frontend scripts in `frontend/package.json`: `npm run dev`, `npm run build`, `npm test` (Vitest).
- Backend dependencies in `backend/requirements.txt`; startup entry is `backend/run.py`; migrations use Flask-Migrate. `.env.example` files exist for both frontend and backend. Backend settings include Flask environment/app, app/JWT secrets, database URL, CORS frontend origins/public URL, cookie security, default restaurant, rate-limit storage, SMTP host/port/credentials/TLS/sender, and bind host/port. Frontend settings include API/auth URLs, data mode, and optional chat webhook. Local `.env` files are present but were not read or edited during this audit.
- `backend/app/middleware/errors.py` defines a second set of JSON error handlers but the app factory registers its own handler functions inline; the middleware helper is not called.
- Frontend test files: `App.test.jsx`, `api.test.js`, `api-mode.test.jsx`, `allocation.test.js`, `operations.test.jsx`.
- Backend pytest files: `test_user.py`, `test_allocation.py`, `test_tables.py`, `test_reservations.py`, `test_operations.py`, `test_health.py`, `test_customer_service_workflow.py`, `test_customer_dashboard_workflows.py`, `test_config.py`, `test_auth.py`.
- Existing docs include `SETUP.md`, `TEAM_WORKFLOW.md`, `IMPLEMENTATION_CHECKLIST.md`, `ARCHITECTURE.md`, and `API_CONTRACT.md`. The latter API/architecture docs had auth-flow claims that do not match current registration code; this report and the new lowercase-hyphen contract are current-code references.

## Prioritized smallest-safe implementation plan

No application refactor was started in this phase. Each next phase should be a small change with a route/API acceptance test before proceeding.

| Priority | Work | Files and dependencies | Risks | Acceptance test |
|---|---|---|---|---|
| 1 | Keep route/build baseline clean and resolve any future merge conflicts before feature work. Current tree has no markers and builds successfully. | `frontend/src/routes/AppRoutes.jsx`, auth pages, Vite config/package scripts. No schema dependency. | Route edits can silently drop a role route or an existing redirect. | `npm run build`; marker scan; route tests exercise every public/auth/workspace URL and unknown-path redirect. |
| 2 | Verify/complete shared route layout and anchors without replacing pages. | `AppRoutes.jsx`, `DashboardLayout.jsx`, `Sidebar.jsx`, `App.jsx`, `constants.js`; depends on the current sitemap. | Wrong anchors or parent routes can make sidebar actions unreachable; customer child paths currently omit chat. | RTL route matrix for four roles, role mismatch, signed-out redirect, nested customer pages, sidebar anchors and mobile menu. |
| 3 | Make role and restaurant context consistent across frontend and backend. | `useRole.jsx`, `api.js`, `Sidebar.jsx`, `auth.py`, `operations.py`; existing membership model is available. | A client-selected tenant must never override membership checks; default behavior and existing records must remain valid. | Multi-tenant tests prove each role sees only the selected tenant, wrong membership is denied, and `/me` role matches the selected workspace. |
| 4 | Reconcile account UI/copy with the implemented verification policy; keep database-backed JWT behavior. | `AuthActionPage.jsx`, `auth.py`, `api.js`, auth tests, README/legacy API docs. No provider or schema change assumed. | Changing verification requirements can lock out current accounts or change onboarding. Decide behavior before altering persistence or delivery. | Register/login/verify/resend/reset tests match one documented flow, including SMTP-unavailable development and production response behavior. |
| 5 | Make host/manager suggestions use the same date-aware allocation contract, then harden reservation, waitlist, check-in, and occupancy flows. | Customer/host/floor/manager dashboards, `useOperationalData.jsx`, `operations.py`, both allocation services, existing workflow tests. Schema changes only after migration review. | Concurrency differs between PostgreSQL and SQLite; no multi-table or automatic late policy currently exists. | Tests cover cross-date recommendation parity between dashboard and API, no exact capacity (select larger), no capacity (409), stale recommendation conflict, overlapping reservations, waitlist priority, check-in/seating, leave-to-available, late/no-show manual policy, and PostgreSQL concurrency separately. |
| 6 | Add focused API/route regression tests and responsive verification for implemented workflows. | Existing `frontend/src/__tests__/` and `backend/tests/`; browser viewport checks. | Avoid brittle tests tied to animation or layout internals. | Run `npm test`, `npm run build`, and backend `pytest`; verify customer and staff workflows at narrow and desktop widths with no unauthorized controls exposed. |
| 7 | Resolve reporting/notifications/prediction scope only after operational data and acceptance criteria are agreed. | Manager dashboard, API/services, potential model/migrations, email/live update infrastructure. | These are absent capabilities and may need product decisions, migrations, external infrastructure, and validated data. | Separate acceptance criteria for historical metric definitions, delivery guarantees, and wait prediction; no demo data counted as live success. |

## Commands to run and verify the application

PowerShell, from the repository root:

```powershell
# Backend: install and migrate the existing configured database
cd backend
if (-not (Test-Path .\venv\Scripts\python.exe)) { python -m venv venv }
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
flask db upgrade
python run.py

# Frontend: second terminal
cd ..\frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev

# Frontend tests and production build
npm test
npm run build

# Backend tests (run from backend)
cd ..\backend
python -m pytest -v
```

Set `DATABASE_URL` before running migrations when using PostgreSQL. An empty local `DATABASE_URL` uses the existing SQLite default. Do not point test commands at production data. Existing database configuration and records were not changed by this audit.

## Verification performed for this phase

- `npm run build` from `frontend/`: **passed** (Vite transformed 1,973 modules and wrote the production bundle).
- Repository-wide unresolved merge marker scan: **no markers found**.
- Frontend Vitest and backend pytest suites: **not run** in this documentation-only phase.
- No migrations were applied, no database was opened for writes, and no application source/config files were edited.
