# Occupie API Contract

Base URL: `http://localhost:5000/api/v1`

Requests and responses use JSON. Operations persist through SQLAlchemy. The current demo API has no authentication or role authorization and must not be exposed to untrusted clients.

## Health

### `GET /health`

Returns HTTP 200 with the service status, database connection state, implemented endpoint map, and remaining planned endpoint map. `status` is `degraded` when the database connection check fails; inspect `database.status` before using persisted operations.

## Tables

### `GET /tables`

Returns `{ "tables": [...] }`, ordered by table ID. Each table has `id`, `name`, `capacity`, `section`, `status`, `assignedServer`, `partySize`, and `timeSeated`.

### `POST /tables`

Creates a table. `id`, `name`, `capacity`, and `section` are required; `status` defaults to `available`, and `assignedServer` is optional. Initial status may be `available`, `reserved`, or `cleaning`.

```json
{
  "id": "T01",
  "name": "Table 1",
  "capacity": 4,
  "section": "Window Patio",
  "assignedServer": "Marco R."
}
```

Returns `{ "table": ... }` with status 201.

### `PATCH /tables/{id}/status`

Accepts a valid `status` (`available`, `occupied`, `reserved`, `cleaning`). To set `occupied`, include a positive `partySize` no larger than the table capacity. Only a currently available table can be directly occupied. Non-occupied states clear the current party and seating time.

## Reservations

### `GET /reservations`

Returns `{ "reservations": [...] }`, ordered by start time. Reservation fields include `id`, `guestName`, `partySize`, `startsAt`, `table`, `status`, `phone`, `notes`, and `seatingPreference`.

### `POST /reservations`

Requires a future ISO 8601 `startsAt`, non-empty `guestName`, and positive `partySize`. `seatingPreference`, `phone`, and `notes` are optional. Occupie assigns a suitable table or returns a conflict if none is available.

```json
{
  "guestName": "Avery Example",
  "partySize": 3,
  "startsAt": "2026-10-10T20:00:00+05:30",
  "seatingPreference": "Window Patio"
}
```

Returns `{ "reservation": ... }` with status 201.

### `PATCH /reservations/{id}/status`

Accepts `checked_in`, `seated`, `cancelled`, or `no_show`. Valid transitions are `confirmed` → one of those states and `checked_in` → `seated`, `cancelled`, or `no_show`. Seating also changes its assigned table to occupied.

## Allocation

### `GET /allocations/recommend?party_size=3&at=2026-10-10T20:00:00Z&preferred_section=Window%20Patio`

Requires a positive integer `party_size`; `at` and `preferred_section` are optional. Returns `available`, a table `recommendation` or `null`, and the applied strategy. A valid request with no suitable table returns status 200 with `available: false`; it does not estimate a wait.

The current algorithm considers only available tables with enough seats, protects confirmed/checked-in reservations in a 90-minute window, honors a requested section when a suitable table exists there, then minimizes unused seats with table ID as a deterministic tie-breaker. It does not predict occupied-table turnover.

## Waitlist

### `GET /waitlist`

Returns active (`waiting` and `ready`) entries ordered oldest first. `waitMinutes` is calculated from `createdAt`; `quotedWait` is `null` because the service does not have validated turnover data.

### `POST /waitlist`

Requires a non-empty `partyName` and positive `partySize`; `contact` is optional. Returns `{ "waitlistEntry": ... }` with status 201. It does not promise a wait time.

### `PATCH /waitlist/{id}`

Accepts `waiting`, `ready`, or `cancelled`. Seating must use the dedicated endpoint so the table and queue update together.

### `POST /waitlist/{id}/seat`

Accepts an optional `{ "tableId": "T01" }`. Without a table ID, the service selects the smallest suitable available table. A party can be seated only if it is the oldest party in the queue that currently has a suitable table. The table becomes occupied and the waitlist record becomes seated in the same request.

## Error format

Operation errors include:

```json
{
  "error": "Validation Error",
  "message": "partySize must be a positive integer.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": { "partySize": "Enter a value greater than zero." }
}
```

Business conflicts use 409; missing resources use 404; invalid input uses 422; malformed requests use 400. The application-level error handler also returns JSON for common HTTP errors. No JWT endpoints are implemented yet.
