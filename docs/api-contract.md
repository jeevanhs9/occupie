# Occupie API contract (verified against registered Flask routes)

**Base URLs:** auth `/api/auth`; operational API `/api/v1`. During local development the Vite server proxies these paths to Flask at `http://127.0.0.1:5000`. JSON is used for request and response bodies unless a row says otherwise.

This file reflects the registered blueprints in `backend/app/__init__.py`. The older route modules `allocations.py`, `reservations.py`, and `tables.py` were unregistered and have been removed as part of the cleanup documented in [`CLEANUP_REPORT.md`](CLEANUP_REPORT.md). The underscore-named `API_CONTRACT.md` is a legacy document; this hyphenated file is the audited contract.

## Request/session rules

- Authenticated requests use `credentials: include` with a short-lived HTTP-only JWT access cookie. Do not put JWTs in browser storage or JSON. There is no refresh-token flow; after the access token expires, sign in again.
- Mutating cookie-authenticated requests need `X-CSRF-TOKEN` equal to the `occupie_csrf_access` cookie. `GET`, `HEAD`, and `OPTIONS` do not need the CSRF header.
- The frontend wrapper in `frontend/src/services/api.js` handles cookies, CSRF, and error normalization. A 401 is returned to the caller without a token refresh retry.
- `/api/v1` tenant selection order is `X-Restaurant-ID`, query `restaurant_id`, JSON `restaurantId`, then `DEFAULT_RESTAURANT_ID`. The current frontend sends no tenant selector, so it uses the configured default.
- Cookie-authenticated cross-origin requests require an origin in `FRONTEND_ORIGINS`; Flask-CORS enables credentials and allows `X-CSRF-TOKEN`.

## Authentication and account endpoints

| Method/path | Request | Response | Authorization and notes |
|---|---|---|---|
| `POST /api/auth/register` | `{ "name": string, "email": string, "password": string }`; name/email max 120; password length 12–128. Extra role input is ignored. | `201 { "message": "Account created. You can now sign in." }`; duplicate email is 409; validation is 422. | Public, rate limited. Creates a customer; password is stored as a Werkzeug scrypt hash. |
| `POST /api/auth/login` | `{ "email": string, "password": string }` | `200 { "user": { "id", "name", "email", "role", "created_at", "restaurantId" } }` plus HTTP-only access and CSRF cookies. Invalid credentials are 401. | Public, rate limited. Role comes from membership at the configured default restaurant, otherwise `customer`. |
| `POST /api/auth/logout` | Empty JSON body. When a valid access cookie is present, a matching access CSRF cookie/header is required. | `200 { "message": "Signed out." }`; expires the access cookies and revokes the access token. | No JWT decorator; with no valid auth cookie it still clears the browser session. |
| `GET /api/auth/me` | No body. | `200 { "user": { ...profile } }`; unauthenticated is 401. | Valid access JWT required. Used to restore the session on page load. |
| `GET /api/auth/restaurants` | No body. | `200 { "restaurants": [{ "id", "name" }] }` | Public. No current frontend page uses this as a restaurant selector. |

Account endpoints have Flask-Limiter limits. Email verification, password recovery, and refresh-token routes are not registered. Production configuration requires explicit strong secrets, PostgreSQL, secure cookies, and shared Redis rate-limit storage. See [SETUP.md](SETUP.md).

## Health

| Method/path | Response | Authorization |
|---|---|---|
| `GET /api/health` or `GET /api/v1/health` | `200 { "status": "ok", "database": "connected" }`; database failure returns 503 with error/disconnected status. | Public. |

## Operational authorization

Every `/api/v1` route below requires a valid access JWT (OPTIONS is allowed for CORS preflight). The backend resolves a restaurant and then checks role membership before running the handler.

| Resource operation | Manager | Host | Floor staff | Customer |
|---|:---:|:---:|:---:|:---:|
| List tables | Yes | Yes | Yes | Yes (reduced table fields) |
| Create table | Yes | — | — | — |
| Change table status | Yes | Yes | Yes | — |
| List reservations | Yes | Yes | Yes | Yes (own only) |
| Create reservation | Yes | Yes | — | Yes (self only) |
| Change reservation status | Yes | Yes | — | Own check-in/cancel only |
| List waitlist | Yes | Yes | Yes | Own active entries only |
| Create waitlist entry | Yes | Yes | — | Yes (one active entry per customer) |
| Change waitlist status | Yes | Yes | — | Own cancellation only |
| Seat waitlist party | Yes | Yes | — | — |
| Get allocation recommendation | Yes | Yes | Yes | Yes |

The role is resolved from `RestaurantMembership`; a user without a staff membership is treated as a customer. A forbidden role/ownership operation returns 403. A missing tenant or resource returns 404.

## Tables

### `GET /api/v1/tables`

Returns `200 { "tables": [table, ...] }` ordered by table ID. A table object is:

```json
{
  "id": "T01",
  "name": "Table 1",
  "capacity": 4,
  "section": "Main Dining",
  "status": "available",
  "assignedServer": null,
  "partySize": 0,
  "timeSeated": null
}
```

Customer responses include only `id`, `name`, `capacity`, `section`, and `status`.

### `POST /api/v1/tables`

Manager only. Body requires non-empty `id` (max 32), `name` (max 80), positive integer `capacity`, and non-empty `section` (defaults to `Main Dining`). Optional `assignedServer` (max 120) and initial `status` (`available`, `reserved`, or `cleaning`) are accepted. An occupied initial status is rejected. Returns `201 { "table": table }`; duplicate ID returns 409; validation returns 422.

### `PATCH /api/v1/tables/{tableId}/status`

Manager, host, or floor staff. Body: `{ "status": "available|occupied|reserved|cleaning", "partySize"?: number }`. `partySize` is required and must fit when status is occupied. Only an available table can be marked occupied directly. Non-occupied statuses clear party/seated time. Returns `200 { "table": table }`; invalid state/conflict returns 409; input validation returns 422.

## Reservations

### `GET /api/v1/reservations`

Returns `200 { "reservations": [reservation, ...] }` ordered by start time and ID. Each response object includes `id`, `restaurantName`, `guestName`, `partySize`, `startsAt` (UTC ISO timestamp ending in `Z`), `time`, `table` (table ID or null), `status`, `phone`, `notes`, and `seatingPreference`. Customer records are filtered to the signed-in customer.

### `POST /api/v1/reservations`

Manager, host, or customer. Body:

```json
{
  "guestName": "Sam Lee",
  "partySize": 3,
  "startsAt": "2026-10-12T19:30:00Z",
  "tableId": "T04",
  "seatingPreference": "Patio",
  "phone": "555-0100",
  "notes": "Window preferred"
}
```

`partySize` is a positive integer; `startsAt` must parse as ISO 8601 and be in the future. Naive timestamps are interpreted as UTC. `tableId`, `seatingPreference` (max 80), `phone` (max 40), and `notes` (max 500) are optional. Staff must provide `guestName`; the customer name and `customer_id` are taken from the authenticated profile. Returns `201 { "reservation": reservation }`. No fitting table, a stale suggested table, or an active duplicate customer booking returns 409.

The server chooses/rechecks one table and stores its ID. The allocator prefers the requested section and then chooses the smallest table with sufficient capacity; it does not join tables.

### `PATCH /api/v1/reservations/{reservationId}/status`

Manager, host, or owning customer. Body: `{ "status": "checked_in|seated|cancelled|no_show" }`. Server transitions are: `confirmed` → checked_in/seated/cancelled/no_show; `checked_in` → seated/cancelled/no_show; terminal states cannot transition. Customers may only set their own reservation to checked_in or cancelled. Seating sets the assigned table occupied and records party size/time. Returns `200 { "reservation": reservation }`; invalid transition or unavailable table returns 409; ownership/role failure returns 403.

## Allocation

### `GET /api/v1/allocations/recommend`

All four roles. Query parameters: required positive integer `party_size`; optional ISO `at`; optional `preferred_section` (max 80). Example:

```text
/api/v1/allocations/recommend?party_size=3&at=2026-10-12T19%3A30%3A00Z&preferred_section=Patio
```

With a candidate: `200 { "available": true, "recommendation": table, "strategy": "smallest_suitable_available_table" }`. Without a candidate: `200 { "available": false, "recommendation": null, "message": "No suitable table is currently available. No wait time estimate is available." }`. Invalid query values return 422. The 90-minute hold window applies to confirmed and checked-in reservations. Occupied-table release prediction is not performed.

## Waitlist

### `GET /api/v1/waitlist`

All four roles. Returns `200 { "waitlist": [entry, ...] }` for active waiting/ready entries, oldest first. Staff see all active entries; customers see only their own. An entry includes `id`, `partyName`, `partySize`, `contact`, `status`, elapsed `waitMinutes`, `quotedWait: null`, optional customer `position`, `table`, and `createdAt`.

### `POST /api/v1/waitlist`

Manager, host, or customer. Body: `{ "partyName": string, "partySize": positive integer, "contact"?: string }`. Customer names are derived from the authenticated profile; customer-supplied party name is ignored. A customer can have only one active entry. Returns `201 { "waitlistEntry": entry }`; duplicate active customer entry returns 409.

### `PATCH /api/v1/waitlist/{entryId}`

Manager, host, or owning customer. Body: `{ "status": "waiting|ready|cancelled" }`. Customer can only cancel their own active entry. Returns `200 { "waitlistEntry": entry }`; an invalid transition returns 409.

### `POST /api/v1/waitlist/{entryId}/seat`

Manager or host. Optional body `{ "tableId": "T01" }`; otherwise the API allocates the smallest suitable available table. Only waiting/ready entries can be seated. The oldest currently serviceable party has priority. On success returns `200 { "waitlistEntry": entry, "table": table }` and updates both records together. No suitable or selected table returns 409.

## Errors and absent contracts

Operational validation errors use 422 and include `error`, `message`, `status_code`, `service`, and optional `fields`. Role/ownership failures use 403; authentication failures use 401; missing tenant/resource uses 404; conflict/business rules use 409. Auth handlers return `{ "message": ... }` and status codes; do not assume every endpoint has the operational `fields` envelope.

There is no registered analytics/revenue/report endpoint, notification endpoint, live event stream, wait-time prediction endpoint, multi-table allocation contract, automatic late-arrival/no-show endpoint, or restaurant-selection workflow in the current frontend. The active table, reservation, and allocation endpoints are implemented by the registered `operations.py` blueprint.
