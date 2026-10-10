# Occupie workflows (current code audit)

**Verified:** 2026-10-11. This guide describes registered Flask routes and the current React workflows. Automated tests and a browser smoke run used an isolated migrated/seeded SQLite database. It does not claim production deployment or PostgreSQL behavior.

## Authentication and role selection

- Public registration at `POST /api/auth/register` always creates a customer. Public signup cannot assign staff roles.
- Login sets a short-lived HTTP-only JWT access cookie and a CSRF cookie. The frontend restores the profile through `GET /api/auth/me`; writes send the CSRF value in `X-CSRF-TOKEN`.
- Staff accounts are provisioned from a trusted backend terminal with `flask --app run provision-staff`. `RestaurantMembership` determines the staff role for the configured restaurant. Users without a membership are customers.
- Browser route gates redirect signed-out users to login and redirect an authenticated user away from another role's dashboard. The API independently enforces roles and customer ownership.
- Email verification, password reset, and refresh-token flows are not registered. Production CORS origins and secure-cookie settings must be configured for the actual deployed site.

## Customer booking and reservation history

1. The customer chooses party size, a future date/time, and optional section on `/dashboard/customer/book`.
2. `GET /api/v1/allocations/recommend` returns the best fit and alternatives or a structured no-match with supported next actions.
3. The customer confirms. `POST /api/v1/reservations` checks the table and booking interval again and returns the persisted reservation ID/reference.
4. Upcoming and history pages use the signed-in customer's reservations. The API filters rows by `customer_id`; the customer can cancel or check in only to their own eligible reservation.
5. `completed` reservations appear in history. Completion is a staff action from a seated reservation and moves its table to `cleaning`.

Allocation is single-table: capacity must be at least party size. There is no joined-table model. The configured hold interval before a reservation and turn interval after it are checked for overlap against the proposed seating interval. Confirmed, checked-in, and seated reservations are active conflicts; cancelled, completed, and no-show records do not hold a table. Allocation never predicts that an occupied table will turn over.

When allocation has no match, the customer page shows the API reason and available next steps. The waitlist action is shown only when the API indicates that joining the queue is a supported action. Waitlist position and elapsed queue time may be shown; a future wait estimate is not computed.

## Host reservation and walk-in service

- The host workspace loads current tables, active reservation records, and the waiting/ready queue from the API. API-mode reservation and walk-in seating recommendations use the server allocator.
- Reservation search filters the loaded host list. A host can check a guest in, seat an eligible reservation, request a table reassignment, or mark a booking no-show after the configured grace period.
- A reassignment request names an available fitting target. It remains pending until a manager approves or rejects it; approval rechecks capacity, current status, and conflicting booking intervals.
- Hosts add and update walk-in queue entries. Seating uses the oldest currently serviceable party and rechecks a single table on the server. A successful seat updates the waitlist entry and table together.
- The no-show grace is configurable from 0 to 120 minutes (default 15). No automatic no-show job or customer reminder runs.

Reservation list display and menu controls were smoke-tested in a browser. Host queue seating and reassignment approval are covered by API/workflow tests; those mutations still need a judge-facing manual walkthrough on the target environment.

## Floor-staff table service

Floor staff can view and update only tables whose `assigned_server` string exactly matches the authenticated account's display name. This is a free-form name match, not a staff identity foreign key; managers must enter the display name exactly when assigning a table.

The API enforces table transitions: `available` can move to occupied, reserved, or cleaning; `reserved` can move to available; `occupied` can move to cleaning; and `cleaning` can move to available. Occupied status requires a party size that fits. Reservation and waitlist seating also set a table occupied. The floor-staff browser smoke test verified its assigned-table list and a cleaning-to-available update.

## Manager workspace

Managers can create tables and manage allocation settings. The settings are restaurant-scoped: turn time (15–360 minutes), reservation hold (0–360), no-show grace (0–120), and utilization target (1–100%). The allocator and reservation transitions use these values.

Manager-only endpoints provide:

- `GET /api/v1/reports/shift`: current table/reservation/waitlist counts, occupied-table utilization against the target, and an average turn duration from completed reservations with seated/completed timestamps. This is a current-state snapshot, not a date-filtered shift or historical trend service.
- `GET /api/v1/reports/export.csv`: operational table, reservation, and waitlist rows from the API.
- `POST /api/v1/tables/import`: insert-only table import from JSON `{ "csv": "id,name,capacity,section\\n..." }`; it accepts 1–500 rows under 1 MB and rejects duplicates without importing a partial batch.
- `POST /api/v1/allocations/simulate`: non-persistent allocation plan for 1–20 requested parties. It conservatively claims each selected table across the submitted sequence.
- `GET/PATCH /api/v1/settings/allocation` and `GET /api/v1/reassignments`, `PATCH /api/v1/reassignments/{id}/status`.

The manager UI reads current operational data and these endpoints. Historical revenue is not stored. The allocation score has a fixed heuristic revenue-opportunity factor; its score/reason is not actual revenue or a revenue forecast. No production report/export or import workflow was run in the browser audit.

## Data refresh, errors, and scope limits

API requests use `VITE_API_BASE_URL` (default `/api/v1`); the client derives `/api/auth` from the same origin. Local Vite proxies `/api/*` to Flask. Credentialed cross-origin requests require the exact frontend origin in `FRONTEND_ORIGINS`. Mutation hooks refresh affected server data; API errors are displayed instead of presenting a failed request as an empty restaurant.

API data refreshes on page entry and after user actions. There is no websocket/SSE or other live push channel. The frontend has no restaurant picker and normally uses `DEFAULT_RESTAURANT_ID`. PostgreSQL production, cross-origin production CORS, and browser behavior on the final demo host still require manual validation.

For the feature-by-feature status, command results, and outstanding priorities, see [FEATURE_GAP_AUDIT.md](FEATURE_GAP_AUDIT.md) and [FINAL_READINESS_AUDIT.md](FINAL_READINESS_AUDIT.md).
