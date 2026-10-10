# Occupie workflows (current code audit)

This describes behavior found in the current React pages and registered Flask API. It distinguishes real API behavior from the development-only local preview.

## Account creation and sign in

### Registration

1. A visitor submits name, email, and a 12–128 character password on `/auth/register`.
2. `POST /api/auth/register` creates a customer account with a Werkzeug password hash. Any submitted role is ignored; the handler assigns `customer`.
3. The page shows the API message. It does not sign the user in automatically; the user returns to login.

Email verification is not part of the current account flow. Historical verification columns remain in the existing schema for compatibility but are not read or written by the current routes.

### Login, session restore, and logout

1. The user submits email/password to `POST /api/auth/login`.
2. On success, the API sets a short-lived HTTP-only access JWT cookie and returns a user profile including role and default `restaurantId`.
3. `useRole` stores the profile in memory. The role route is selected from the server profile; demo role state is not used in API mode.
4. On app startup, the client calls `GET /api/auth/me`. An expired access token returns 401 and the user signs in again.
5. Logout calls `POST /api/auth/logout`, supplies a CSRF token, and clears/revokes session cookies. A client logout failure leaves the current profile in place and exposes an auth error.

**Authorization:** public registration creates customers only. Trusted staff provisioning creates `RestaurantMembership` records for manager, host, or floor staff. The role used by the profile is the membership role for `DEFAULT_RESTAURANT_ID`, or customer if none exists.

## Customer reservation

1. The customer opens `/dashboard/customer/book`, enters party size, date/time, optional seating preference, phone, and notes.
2. `useOperationalData` calls `GET /api/v1/allocations/recommend?party_size=…&at=…&preferred_section=…`. The API checks restaurant tables and protects confirmed/checked-in reservation assignments within a 90-minute window.
3. If a table is recommended, the page submits `POST /api/v1/reservations` with `partySize`, ISO `startsAt`, optional `tableId`, `seatingPreference`, `phone`, and `notes`. The server derives `guestName` and `customer_id` from the authenticated user; the browser cannot book for a different customer identity.
4. The API validates the timestamp and request, rechecks availability, and creates a `confirmed` reservation for one table. It returns 409 if availability changed or no table fits.
5. Upcoming and history pages load the user's reservations through `GET /api/v1/reservations`; the backend filters customer results by the signed-in user.

**Capacity matching:** an exact table size is not required. The allocator picks a table at least as large as the party, preferring the requested section, then the smallest surplus capacity, then stable table ID. If no single table fits, reservation creation returns 409. Combining multiple tables is not supported by the model or allocator.

**Conflict handling:** the request is validated again at creation, and a supplied recommended `tableId` is not blindly trusted. Active reservation time conflicts use a 90-minute protection window. PostgreSQL row locks are used while assigning a table. SQLite does not honor those row locks, so local SQLite does not provide the same concurrent-request guarantee.

## Customer cancellation and check-in

- A customer can transition their own `confirmed` reservation to `cancelled` or `checked_in` using `PATCH /api/v1/reservations/{id}/status`.
- The server rejects a customer status change for another user's reservation and rejects unsupported status transitions.
- A host or manager can perform operational status changes, including `seated` and `no_show`, subject to the transition rules.
- Seating a reservation changes the reservation status and its table to `occupied`, recording party size and seating time.
- Cancelling a reservation removes it from the active reservation hold set. There is no notification sent to the customer.

## Host reservation and walk-in seating

### Reservations

The host loads restaurant reservations and tables, creates a guest reservation through the same reservations endpoint, and marks an arrived party checked in or seated. Host/manager dashboard recommendation cards call the browser-side `services/allocation.js` helper over loaded records; customer booking recommendations call the server endpoint. The backend checks reservation transitions and table availability before seating. If the assigned table is unavailable, occupied, undersized, or protected for another booking, seating returns 409 and leaves the request unresolved for staff action. Because the browser helper reduces reservation times to time-of-day while the server compares full timestamps, suggestions can disagree across dates; the backend remains authoritative when a seating action is submitted.

### Walk-in queue

1. A host adds a walk-in with party name, party size, and optional contact using `POST /api/v1/waitlist`.
2. The party enters `waiting`; a host/manager can move it to `ready` or cancel it using `PATCH /api/v1/waitlist/{id}`.
3. Seating uses `POST /api/v1/waitlist/{id}/seat`, optionally with a requested `tableId`. If omitted, the server selects a suitable single table.
4. The server protects reservation holds and prioritizes the oldest currently serviceable waiting/ready party. On success it sets the waitlist entry to `seated` and the table to `occupied` in the same request.

Customers may also create one active waitlist entry for themselves, view only their own active entries, and cancel their own entry. The customer API response includes queue position. The model returns elapsed `waitMinutes`; `quotedWait` is always `null`.

## Floor staff occupancy updates

Floor staff can read tables, reservations, and waitlist entries, and can use `PATCH /api/v1/tables/{id}/status` for table service state. Marking a table occupied requires a positive `partySize` that fits and an available table. Setting another allowed status clears current party size and `timeSeated`; setting `available` is the current way to mark a vacated/cleaned table available.

The status endpoint supports `available`, `occupied`, `reserved`, and `cleaning`. Reservation seating and waitlist seating also set `occupied`. The API does not track a separate customer departure event or connect a table departure to reservation completion.

## Late arrival and no-show handling

The reservation model has a `no_show` status and the API allows staff to set it from `confirmed` or `checked_in`. This is a manual action. There is no configured grace period, automatic late-arrival transition, scheduled job, or customer reminder. A host must decide whether to retain or mark the reservation; the code does not infer arrival from elapsed time.

## Manager reporting

The manager dashboard shows current tables/reservations/waitlist and derived current-state cards. Some preview metrics are drawn from labeled demo fixtures; live unavailable historical fields such as average turnover display as unavailable. The shift CSV is generated in the browser from the currently loaded data. There is no analytics/revenue endpoint, durable report job, or historical revenue model in the registered API.

## Unsupported or partial capabilities

- No combined-table allocation for larger parties.
- No reliable wait-time estimate or occupied-table turnover prediction; waitlist `quotedWait` is null.
- No automatic late-arrival/no-show job or reminder.
- No reservation, waitlist, or table live push notifications. Customer waitlist and health displays use polling; operational data otherwise refreshes on page mount/manual action.
- No revenue reporting or historical analytics service/API.
- Restaurant scoping exists on the backend, but the frontend has no restaurant picker and does not send `X-Restaurant-ID`; normal UI traffic resolves to the configured default tenant.
- Email delivery is used for configured account actions only; there are no reservation lifecycle emails.

For exact request and response shapes, see [api-contract.md](api-contract.md).
