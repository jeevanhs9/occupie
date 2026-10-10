# Occupie API Contract

> **Legacy reference:** the current registered routes and code-verified request/response shapes are documented in [api-contract.md](api-contract.md). This older document contains stale claims, including that email verification is required before login. Use the linked audited contract for current behavior; this file is retained for existing links.

Operations base URL: `http://localhost:5000/api/v1`

Authentication base URL: `http://localhost:5000/api/auth`

Requests and responses use JSON. Authentication uses HTTP-only access and refresh cookies. The frontend must send credentials and include the CSRF token from `occupie_csrf_access` as `X-CSRF-TOKEN` on mutating authenticated requests. Refresh requests use `occupie_csrf_refresh`. Cross-origin clients must use an origin in `FRONTEND_ORIGINS` and `credentials: include`.

## Authentication

### `POST /register`

Accepts `name`, `email`, and a 12–128 character password. Always creates a customer account, regardless of any supplied role property. Returns 201 and whether verification email delivery succeeded. Email verification is required before login.

### `POST /verify`

Accepts `{ "token": "..." }`. Verifies an unexpired email token. Verification tokens expire after 24 hours and can be used once.

### `POST /resend-verification`

Accepts an email address. Returns the same generic response whether or not the account exists.

### `POST /login`

Accepts email and password. On success, sets HTTP-only access and refresh cookies and returns the user profile. Tokens are not returned in JSON. Unverified accounts receive 403.

### `POST /refresh`

Requires a valid refresh cookie and CSRF token. Rotates both cookies and revokes the consumed refresh token.

### `POST /logout`

Requires a valid access cookie and CSRF token. Revokes access and refresh token IDs and expires auth cookies.

### `GET /me`

Returns `{ "user": { ... } }` for the authenticated user. The profile role comes from the default restaurant membership, or is `customer` when no staff membership exists.

### `POST /forgot-password`

Accepts an email address and responds generically. Reset tokens expire after 30 minutes and are single use.

### `POST /reset-password`

Accepts `{ "token": "...", "password": "12–128 characters" }`. Updating the password invalidates previous sessions.

### `GET /restaurants`

Returns the available restaurant IDs and names for choosing a tenant where the current UI supports it.

Registration, login, verification, and reset requests are rate-limited. When SMTP is not configured in local development, the backend logs verification/reset links and returns `verificationEmailSent: false`; it does not claim delivery. Production requires SMTP.

## Authorization and tenant scope

Every `/api/v1` operations request requires authentication. The server selects the tenant from `X-Restaurant-ID`, `restaurant_id`, a JSON `restaurantId`, or `DEFAULT_RESTAURANT_ID` in that order. Staff permissions come from a restaurant membership; public requests cannot create staff memberships. A user without a staff membership is treated as a customer.

Customers can view table availability, create their own reservations, list only their own reservations, and check in to or cancel their own reservation. Customers cannot read staff waitlist data or perform staff operations. Manager, host, and floor staff permissions are checked on the server for each operation. Records are queried by restaurant ID; reservation operations also enforce customer ownership.

Staff accounts are provisioned using `flask provision-staff` from a trusted backend terminal.

## Health

### `GET /health`

Available at `/api/health` and `/api/v1/health`. Returns service status and database readiness.

## Tables

### `GET /tables`

Returns `{ "tables": [...] }`, ordered by table ID. Customer results omit staff assignment and seating details.

### `POST /tables`

Manager only. Creates a table. `id`, `name`, and positive `capacity` are required; `section` defaults to `Main Dining`, and `assignedServer` is optional. Initial status can be `available`, `reserved`, or `cleaning`.

### `PATCH /tables/{id}/status`

Manager, host, or floor staff. Accepts status (`available`, `occupied`, `reserved`, `cleaning`). For `occupied`, include a positive `partySize` no larger than capacity. Other statuses clear current party and seating time.

## Reservations

### `GET /reservations`

Returns `{ "reservations": [...] }` for the restaurant. Customer results are restricted to reservations they own.

### `POST /reservations`

Requires a future ISO 8601 `startsAt` and positive `partySize`. Staff must provide `guestName`; customer guest name is taken from the authenticated account. `seatingPreference`, `phone`, and `notes` are optional. The server selects a suitable table or returns 409 when none is available. A provided `tableId` is validated again during creation.

### `PATCH /reservations/{id}/status`

Accepts a valid transition to `checked_in`, `seated`, `cancelled`, or `no_show`. Customers may only check in to or cancel their own reservation. Seating updates the assigned table to occupied. Conflicts return 409.

## Allocation

### `GET /allocations/recommend?party_size=3&at=2026-10-10T20:00:00Z&preferred_section=Window%20Patio`

Requires a positive integer `party_size`; `at` and `preferred_section` are optional. Returns `available`, a table `recommendation` or `null`, and the applied strategy. A valid request with no suitable table returns 200 with `available: false`; it does not estimate a wait.

The rule filters to available tables with enough seats, protects confirmed/checked-in reservation windows, treats section as a preference, then selects the smallest suitable table with a stable ID tie-breaker. It does not predict when occupied tables will clear.

## Waitlist

### `GET /waitlist`

Manager, host, or floor staff. Returns active (`waiting`, `ready`) entries oldest first. Customers receive an empty list. `waitMinutes` is elapsed time and `quotedWait` is `null` because no validated estimate is implemented.

### `POST /waitlist`

Manager or host. Requires non-empty `partyName` and positive `partySize`; `contact` is optional. Returns 201. It does not promise a wait time.

### `PATCH /waitlist/{id}`

Manager or host. Sets status to `waiting`, `ready`, or `cancelled`. Seating must use the dedicated endpoint.

### `POST /waitlist/{id}/seat`

Manager or host. Accepts optional `{ "tableId": "T01" }`. Otherwise selects the smallest suitable available table. A party can be seated only when it is the oldest waiting party that currently has a suitable table. The table and waitlist record update in the same request.

## Errors

Authentication failures return 401; role or ownership failures return 403; missing records return 404; business conflicts return 409; invalid input returns 422. Operation errors include `error`, `message`, `status_code`, and optional field details.
