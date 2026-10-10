# Occupie REST API Reference

**Version:** 1.0  
**Base URLs:**
- Authentication: `http://localhost:5000/api/auth`
- Operations: `http://localhost:5000/api/v1`

**Last Updated:** October 11, 2026  
**Status:** Local API reference; production deployment is not verified

> **Audit note:** This document contains older examples and does not yet describe every current response field consistently. The **Current audit addendum** at the end records the endpoints and role boundaries added during the 2026-10-11 audit. The registered implementation in `backend/app/routes/operations.py` is authoritative when older examples disagree.

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication Endpoints](#2-authentication-endpoints)
3. [Health Check Endpoint](#3-health-check-endpoint)
4. [Table Management Endpoints](#4-table-management-endpoints)
5. [Reservation Endpoints](#5-reservation-endpoints)
6. [Waitlist Endpoints](#6-waitlist-endpoints)
7. [Allocation Endpoints](#7-allocation-endpoints)
8. [Error Response Format](#8-error-response-format)
9. [Rate Limiting](#9-rate-limiting)
10. [Testing Examples](#10-testing-examples)

---

## 1. API Overview

### Authentication Model

All `/api/v1` endpoints require JWT authentication via HTTP-only cookies. Authentication endpoints (`/api/auth`) use cookies for session management.

**Cookie-Based Authentication:**
- Access token stored in `occupie_access` cookie (HTTP-only, 15-minute expiry)
- CSRF token stored in `occupie_csrf_access` cookie
- Mutating requests require `X-CSRF-TOKEN` header matching CSRF cookie

**Request Headers:**
```http
Cookie: occupie_access=<jwt-token>
X-CSRF-TOKEN: <csrf-token>  # Required for POST, PATCH, DELETE
Content-Type: application/json
```

### Authorization Model

Endpoints enforce role-based permissions:
- **Manager**: Full access to all operations
- **Host**: Reservation and waitlist management, seating operations
- **Floor Staff**: Table status updates, read-only reservations
- **Customer**: Self-service reservations, own data only

### Tenant Selection

Operations are scoped to a restaurant. Tenant resolution order:
1. `X-Restaurant-ID` header
2. `restaurant_id` query parameter
3. `restaurantId` in JSON body
4. `DEFAULT_RESTAURANT_ID` configuration (default: `"default"`)

### Common Response Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET or PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE (rare) |
| 400 | Bad Request | Malformed request |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Business logic conflict |
| 422 | Validation Error | Invalid input data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

## 2. Authentication Endpoints

### 2.1 Register Customer Account

Create a new customer account.

**Endpoint:** `POST /api/auth/register`  
**Authentication:** None (public)  
**Rate Limit:** 5 requests per hour  

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

**Field Validation:**
- `name`: Required, 1-120 characters
- `email`: Required, valid email format, unique, ≤120 characters
- `password`: Required, 12-128 characters

**Success Response (201):**
```json
{
  "message": "Account created. You can now sign in."
}
```

**Error Responses:**

*Duplicate Email (409):*
```json
{
  "message": "An account with this email already exists."
}
```

*Validation Error (422):*
```json
{
  "message": "Password must be between 12 and 128 characters long."
}
```

*Rate Limit (429):*
```json
{
  "message": "Too many registration attempts. Please try again later."
}
```

**Notes:**
- Always creates role='customer' (ignores any submitted role field)
- Password hashed with Werkzeug scrypt
- Does NOT auto-login (user must sign in separately)
- Email verification not currently enforced

**Implementation:** `backend/app/routes/auth.py` line 88

---

### 2.2 Login

Authenticate user and receive JWT cookies.

**Endpoint:** `POST /api/auth/login`  
**Authentication:** None (public)  
**Rate Limit:** 10 requests per 15 minutes  

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "customer",
    "restaurantId": "default",
    "created_at": "2026-10-10T10:00:00Z"
  }
}
```

**Response Headers:**
```http
Set-Cookie: occupie_access=<jwt-token>; HttpOnly; SameSite=Lax; Path=/
Set-Cookie: occupie_csrf_access=<csrf-token>; Path=/
```

**Error Responses:**

*Invalid Credentials (401):*
```json
{
  "message": "Invalid email or password."
}
```

**Notes:**
- Role resolved from `RestaurantMembership` table
- If no staff membership exists, defaults to 'customer'
- JWT expires in 15 minutes
- CSRF token required for subsequent mutations

**Implementation:** `backend/app/routes/auth.py` line 126

---

### 2.3 Get Current User

Restore session from JWT cookie.

**Endpoint:** `GET /api/auth/me`  
**Authentication:** JWT cookie required  

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "host",
    "restaurantId": "default",
    "created_at": "2026-10-10T10:00:00Z"
  }
}
```

**Error Responses:**

*Unauthorized (401):*
```json
{
  "error": "Unauthorized",
  "message": "Your session has expired. Sign in again."
}
```

**Notes:**
- Used by frontend on page load to restore session
- Validates JWT signature and expiry
- Checks token revocation and auth_version
- Returns current role from membership table

**Implementation:** `backend/app/routes/auth.py` line 162

---

### 2.4 Logout

Revoke JWT and clear cookies.

**Endpoint:** `POST /api/auth/logout`  
**Authentication:** JWT cookie (expired tokens allowed)  
**CSRF Protection:** Required  

**Request Headers:**
```http
Cookie: occupie_access=<jwt-token>
Cookie: occupie_csrf_access=<csrf-token>
X-CSRF-TOKEN: <csrf-token>
```

**Request Body:**
```json
{}
```

**Success Response (200):**
```json
{
  "message": "Signed out."
}
```

**Response Headers:**
```http
Set-Cookie: occupie_access=; Max-Age=0; Path=/
Set-Cookie: occupie_csrf_access=; Max-Age=0; Path=/
```

**Error Responses:**

*CSRF Mismatch (401):*
```json
{
  "error": "Unauthorized",
  "message": "A valid CSRF token is required to sign out."
}
```

**Notes:**
- Adds JWT ID to `revoked_tokens` table
- Clears all auth-related cookies
- Works even if JWT has expired
- Frontend should redirect to login after successful logout

**Implementation:** `backend/app/routes/auth.py` line 141

---

### 2.5 List Restaurants

Get available restaurants for tenant selection.

**Endpoint:** `GET /api/auth/restaurants`  
**Authentication:** None (public)  

**Success Response (200):**
```json
{
  "restaurants": [
    {
      "id": "default",
      "name": "Occupie Restaurant"
    },
    {
      "id": "downtown-bistro",
      "name": "Downtown Bistro"
    }
  ]
}
```

**Notes:**
- Public endpoint (no authentication required)
- Returns all restaurants ordered by name
- Used for multi-restaurant selection UI (not currently implemented in frontend)

**Implementation:** `backend/app/routes/auth.py` line 169

---

## 3. Health Check Endpoint

### 3.1 Health Status

Check API and database connectivity.

**Endpoint:** `GET /api/health` or `GET /api/v1/health`  
**Authentication:** None (public)  

**Success Response (200):**
```json
{
  "status": "ok",
  "database": "connected"
}
```

**Error Response (503):**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "Database connection failed"
}
```

**Notes:**
- Available at both `/api/health` and `/api/v1/health`
- Tests database connectivity with simple query
- Used by monitoring systems and deployment health checks

**Implementation:** `backend/app/routes/health.py`

---

## 4. Table Management Endpoints

### 4.1 List Tables

Get all tables for the selected restaurant.

**Endpoint:** `GET /api/v1/tables`  
**Authentication:** JWT required  
**Permissions:** All roles  

**Success Response (200):**

*For Manager/Host/Floor Staff:*
```json
{
  "tables": [
    {
      "id": "T01",
      "name": "Table 1",
      "capacity": 4,
      "section": "Main Dining",
      "status": "available",
      "assignedServer": "Alice Smith",
      "partySize": 0,
      "timeSeated": null
    },
    {
      "id": "T02",
      "name": "Table 2",
      "capacity": 2,
      "section": "Patio",
      "status": "occupied",
      "assignedServer": "Bob Jones",
      "partySize": 2,
      "timeSeated": "2026-10-10T18:30:00Z"
    }
  ]
}
```

*For Customer (limited fields):*
```json
{
  "tables": [
    {
      "id": "T01",
      "name": "Table 1",
      "capacity": 4,
      "section": "Main Dining",
      "status": "available"
    }
  ]
}
```

**Table Status Values:**
- `available`: Ready for seating
- `occupied`: Currently in use
- `reserved`: Manually reserved
- `cleaning`: Being cleaned

**Notes:**
- Ordered by table ID
- Customer response omits `assignedServer`, `partySize`, `timeSeated`
- Tenant-scoped by restaurant

**Implementation:** `backend/app/routes/operations.py` line 151

---

### 4.2 Create Table

Add a new table to the floor plan.

**Endpoint:** `POST /api/v1/tables`  
**Authentication:** JWT required  
**Permissions:** Manager only  

**Request Body:**
```json
{
  "id": "T15",
  "name": "Table 15",
  "capacity": 6,
  "section": "Private Alcove",
  "assignedServer": "Charlie Brown",
  "status": "available"
}
```

**Field Validation:**
- `id`: Required, unique, ≤32 characters
- `name`: Required, ≤80 characters
- `capacity`: Required, positive integer
- `section`: ≤80 characters, defaults to "Main Dining"
- `assignedServer`: Optional, ≤120 characters
- `status`: Must be `available`, `reserved`, or `cleaning` (cannot create as `occupied`)

**Success Response (201):**
```json
{
  "table": {
    "id": "T15",
    "name": "Table 15",
    "capacity": 6,
    "section": "Private Alcove",
    "status": "available",
    "assignedServer": "Charlie Brown",
    "partySize": 0,
    "timeSeated": null
  }
}
```

**Error Responses:**

*Duplicate ID (409):*
```json
{
  "error": "Conflict",
  "message": "A record with that identifier already exists.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Validation Error (422):*
```json
{
  "error": "Validation Error",
  "message": "capacity must be a positive integer.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "capacity": "Enter a value greater than zero."
  }
}
```

*Forbidden (403):*
```json
{
  "error": "Resource Not Found",
  "message": "You do not have permission to perform this operation.",
  "status_code": 403,
  "service": "occupie-api"
}
```

**Notes:**
- Records audit event: `table.created`
- Cannot create table with `status='occupied'` (use seating operations)

**Implementation:** `backend/app/routes/operations.py` line 168

---

### 4.3 Update Table Status

Change table status during service.

**Endpoint:** `PATCH /api/v1/tables/{tableId}/status`  
**Authentication:** JWT required  
**Permissions:** Manager, Host, Floor Staff  

**Request Body:**

*Mark Occupied:*
```json
{
  "status": "occupied",
  "partySize": 4
}
```

*Mark Available:*
```json
{
  "status": "available"
}
```

*Mark Cleaning:*
```json
{
  "status": "cleaning"
}
```

**Field Validation:**
- `status`: Required, must be valid table status
- `partySize`: Required when `status='occupied'`, must be ≤ table capacity

**Success Response (200):**
```json
{
  "table": {
    "id": "T01",
    "name": "Table 1",
    "capacity": 4,
    "section": "Main Dining",
    "status": "occupied",
    "assignedServer": "Alice Smith",
    "partySize": 4,
    "timeSeated": "2026-10-10T19:00:00Z"
  }
}
```

**Status Transition Rules:**
- `available` → `occupied`, `reserved`, `cleaning`
- `occupied` → `available`, `cleaning`
- `reserved` → `available`, `occupied`, `cleaning`
- `cleaning` → `available`, `reserved`

**Error Responses:**

*Invalid Transition (409):*
```json
{
  "error": "Conflict",
  "message": "Only an available table can be marked occupied directly.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Party Too Large (422):*
```json
{
  "error": "Validation Error",
  "message": "partySize must be a positive integer no larger than table capacity.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "partySize": "Must fit this table."
  }
}
```

**Notes:**
- Setting `status='occupied'` sets `party_size` and `time_seated`
- Other statuses clear `party_size=0` and `time_seated=null`
- Records audit event: `table.status_changed`
- Uses row-level locking in PostgreSQL

**Implementation:** `backend/app/routes/operations.py` line 232

---

## 5. Reservation Endpoints

### 5.1 List Reservations

Get reservations for the selected restaurant.

**Endpoint:** `GET /api/v1/reservations`  
**Authentication:** JWT required  
**Permissions:** All roles (customers see only their own)  

**Success Response (200):**
```json
{
  "reservations": [
    {
      "id": "RES-A1B2C3D4",
      "restaurantName": "Occupie Restaurant",
      "guestName": "John Smith",
      "partySize": 4,
      "startsAt": "2026-10-12T19:30:00Z",
      "time": "19:30",
      "table": "T08",
      "status": "confirmed",
      "phone": "555-1234",
      "notes": "Window preferred",
      "seatingPreference": "Patio"
    },
    {
      "id": "RES-E5F6G7H8",
      "restaurantName": "Occupie Restaurant",
      "guestName": "Jane Doe",
      "partySize": 2,
      "startsAt": "2026-10-12T20:00:00Z",
      "time": "20:00",
      "table": "T03",
      "status": "checked_in",
      "phone": null,
      "notes": null,
      "seatingPreference": null
    }
  ]
}
```

**Reservation Status Values:**
- `confirmed`: Reservation created, table assigned
- `checked_in`: Customer checked in online
- `seated`: Party seated at table
- `cancelled`: Reservation cancelled
- `no_show`: Party did not arrive

**Filtering:**
- **Customer role**: Only returns reservations where `customer_id = current_user.id`
- **Staff roles**: Returns all reservations for the restaurant

**Sorting:**
- Ordered by `starts_at` ASC, then `id` ASC

**Implementation:** `backend/app/routes/operations.py` line 277

---

### 5.2 Create Reservation

Book a table for a future date/time.

**Endpoint:** `POST /api/v1/reservations`  
**Authentication:** JWT required  
**Permissions:** Manager, Host, Customer  

**Request Body:**

*Customer Request (guestName auto-filled):*
```json
{
  "partySize": 4,
  "startsAt": "2026-10-12T19:30:00Z",
  "tableId": "T08",
  "seatingPreference": "Patio",
  "phone": "555-1234",
  "notes": "Window preferred"
}
```

*Staff Request (must provide guestName):*
```json
{
  "guestName": "Walk-in Guest",
  "partySize": 3,
  "startsAt": "2026-10-12T18:00:00Z",
  "tableId": "T05",
  "phone": "555-5678",
  "notes": ""
}
```

**Field Validation:**
- `guestName`: Required for staff, auto-filled for customers (from `user.name`), ≤120 characters
- `partySize`: Required, positive integer
- `startsAt`: Required, ISO 8601 datetime, must be in future
- `tableId`: Optional, will be auto-allocated if omitted, must be valid table ID
- `seatingPreference`: Optional, ≤80 characters
- `phone`: Optional, ≤40 characters
- `notes`: Optional, ≤500 characters

**Success Response (201):**
```json
{
  "reservation": {
    "id": "RES-A1B2C3D4",
    "restaurantName": "Occupie Restaurant",
    "guestName": "John Smith",
    "partySize": 4,
    "startsAt": "2026-10-12T19:30:00Z",
    "time": "19:30",
    "table": "T08",
    "status": "confirmed",
    "phone": "555-1234",
    "notes": "Window preferred",
    "seatingPreference": "Patio"
  }
}
```

**Error Responses:**

*No Available Table (409):*
```json
{
  "error": "Conflict",
  "message": "No suitable table is available for that party and time.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Duplicate Reservation (409):*
```json
{
  "error": "Conflict",
  "message": "You already have an active reservation at that time.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Suggested Table Unavailable (409):*
```json
{
  "error": "Conflict",
  "message": "The suggested table is no longer available for that time. Request a new recommendation.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Invalid DateTime (422):*
```json
{
  "error": "Validation Error",
  "message": "startsAt must be a future datetime.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "startsAt": "Choose a future time."
  }
}
```

**Notes:**
- If `tableId` not provided, system allocates best table using adaptive scoring
- If `tableId` provided, system rechecks availability (prevents race conditions)
- Uses row-level locking (`SELECT FOR UPDATE`) in PostgreSQL
- Prevents duplicate active customer bookings at same time (unique constraint)
- Records audit event: `reservation.created`
- Customer's `customer_id` stored for ownership tracking

**Implementation:** `backend/app/routes/operations.py` line 287

---

### 5.3 Update Reservation Status

Change reservation status (check-in, seat, cancel, no-show).

**Endpoint:** `PATCH /api/v1/reservations/{reservationId}/status`  
**Authentication:** JWT required  
**Permissions:** Variable by status (see below)  

**Request Body:**
```json
{
  "status": "checked_in"
}
```

**Valid Status Values:**
- `checked_in`: Customer checks in online
- `seated`: Host seats party at table
- `cancelled`: Reservation cancelled
- `no_show`: Party did not arrive

**Permission Matrix:**

| Status | Customer | Host | Floor Staff | Manager |
|--------|:--------:|:----:|:-----------:|:-------:|
| `checked_in` | ✅ (own) | ✅ | ❌ | ✅ |
| `cancelled` | ✅ (own) | ✅ | ❌ | ✅ |
| `seated` | ❌ | ✅ | ❌ | ✅ |
| `no_show` | ❌ | ✅ | ❌ | ✅ |

**Status Transition Rules:**
- `confirmed` → `checked_in`, `seated`, `cancelled`, `no_show`
- `checked_in` → `seated`, `cancelled`, `no_show`
- `seated` → (terminal, no transitions)
- `cancelled` → (terminal, no transitions)
- `no_show` → (terminal, no transitions)

**Success Response (200):**
```json
{
  "reservation": {
    "id": "RES-A1B2C3D4",
    "restaurantName": "Occupie Restaurant",
    "guestName": "John Smith",
    "partySize": 4,
    "startsAt": "2026-10-12T19:30:00Z",
    "time": "19:30",
    "table": "T08",
    "status": "seated",
    "phone": "555-1234",
    "notes": "Window preferred",
    "seatingPreference": "Patio"
  }
}
```

**Error Responses:**

*Invalid Transition (409):*
```json
{
  "error": "Conflict",
  "message": "A reservation cannot move from confirmed to no_show.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Not Owned (403):*
```json
{
  "error": "Resource Not Found",
  "message": "Customers may only check in to or cancel their own reservation.",
  "status_code": 403,
  "service": "occupie-api"
}
```

*Table Unavailable for Seating (409):*
```json
{
  "error": "Conflict",
  "message": "The reservation table is not available for seating because it is occupied, too small, or protected for another reservation.",
  "status_code": 409,
  "service": "occupie-api"
}
```

**Notes:**
- **Seating Operation**: When status changes to `seated`:
  - Locks assigned table with `FOR UPDATE`
  - Rechecks table availability (excluding current reservation)
  - Updates table: `status='occupied'`, `party_size`, `time_seated`
  - Records dual audit events (reservation + table)
- **Customer Restrictions**: Can only `checked_in` or `cancelled` their own reservations
- **No Rollback**: Status changes are immediate and atomic

**Implementation:** `backend/app/routes/operations.py` line 397

---

## 6. Waitlist Endpoints

### 6.1 List Waitlist

Get active waitlist entries.

**Endpoint:** `GET /api/v1/waitlist`  
**Authentication:** JWT required  
**Permissions:** All roles  

**Success Response (200):**

*For Manager/Host/Floor Staff:*
```json
{
  "waitlist": [
    {
      "id": "WL-12345678",
      "partyName": "Smith Party",
      "partySize": 3,
      "contact": "555-9876",
      "status": "waiting",
      "waitMinutes": 12,
      "quotedWait": null,
      "position": null,
      "table": null,
      "createdAt": "2026-10-10T18:45:00Z"
    },
    {
      "id": "WL-87654321",
      "partyName": "Jones Party",
      "partySize": 2,
      "contact": null,
      "status": "ready",
      "waitMinutes": 5,
      "quotedWait": null,
      "position": null,
      "table": null,
      "createdAt": "2026-10-10T18:52:00Z"
    }
  ]
}
```

*For Customer (includes position):*
```json
{
  "waitlist": [
    {
      "id": "WL-12345678",
      "partyName": "Smith Party",
      "partySize": 3,
      "contact": "555-9876",
      "status": "waiting",
      "waitMinutes": 12,
      "quotedWait": null,
      "position": 1,
      "table": null,
      "createdAt": "2026-10-10T18:45:00Z"
    }
  ]
}
```

**Waitlist Status Values:**
- `waiting`: In queue, waiting for table
- `ready`: Table available, party notified
- `seated`: Party seated (terminal, removed from active list)
- `cancelled`: Party left/cancelled (terminal, removed from active list)

**Filtering:**
- Only returns active entries: `status IN ('waiting', 'ready')`
- **Customer role**: Only entries where `created_by_id = current_user.id`
- **Staff roles**: All active entries for restaurant

**Sorting:**
- Ordered by `created_at` ASC, then `id` ASC (FIFO queue)

**Notes:**
- `waitMinutes`: Calculated as elapsed time since `created_at`
- `quotedWait`: Always `null` (wait time prediction not implemented)
- `position`: Queue position (only for customers, calculated per request)

**Implementation:** `backend/app/routes/operations.py` line 465

---

### 6.2 Add Waitlist Entry

Add party to walk-in queue.

**Endpoint:** `POST /api/v1/waitlist`  
**Authentication:** JWT required  
**Permissions:** Manager, Host, Customer  

**Request Body:**

*Staff Request:*
```json
{
  "partyName": "Smith Party",
  "partySize": 3,
  "contact": "555-9876"
}
```

*Customer Request (partyName auto-filled):*
```json
{
  "partySize": 2,
  "contact": "555-5555"
}
```

**Field Validation:**
- `partyName`: Required for staff, auto-filled for customers (from `user.name`), ≤120 characters
- `partySize`: Required, positive integer
- `contact`: Optional, ≤40 characters

**Success Response (201):**
```json
{
  "waitlistEntry": {
    "id": "WL-12345678",
    "partyName": "Smith Party",
    "partySize": 3,
    "contact": "555-9876",
    "status": "waiting",
    "waitMinutes": 0,
    "quotedWait": null,
    "position": 3,
    "table": null,
    "createdAt": "2026-10-10T19:00:00Z"
  }
}
```

**Error Responses:**

*Duplicate Active Entry (409):*
```json
{
  "error": "Conflict",
  "message": "You already have an active waitlist entry.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Validation Error (422):*
```json
{
  "error": "Validation Error",
  "message": "partySize must be a positive integer.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "partySize": "Enter a value greater than zero."
  }
}
```

**Notes:**
- Customer can only have one active entry at a time
- Initial status always `'waiting'`
- Records audit event: `waitlist.created`
- `position` calculated at response time (for customers)

**Implementation:** `backend/app/routes/operations.py` line 505

---

### 6.3 Update Waitlist Status

Change waitlist entry status.

**Endpoint:** `PATCH /api/v1/waitlist/{entryId}`  
**Authentication:** JWT required  
**Permissions:** Manager, Host, Customer (cancel own only)  

**Request Body:**
```json
{
  "status": "ready"
}
```

**Valid Status Values:**
- `waiting`: In queue
- `ready`: Table available
- `cancelled`: Party left

**Status Transition Rules:**
- `waiting` → `ready`, `cancelled`
- `ready` → `waiting`, `cancelled`
- `cancelled` → (terminal, no transitions)
- `seated` → (terminal, cannot be updated via this endpoint)

**Success Response (200):**
```json
{
  "waitlistEntry": {
    "id": "WL-12345678",
    "partyName": "Smith Party",
    "partySize": 3,
    "contact": "555-9876",
    "status": "ready",
    "waitMinutes": 15,
    "quotedWait": null,
    "position": null,
    "table": null,
    "createdAt": "2026-10-10T18:45:00Z"
  }
}
```

**Error Responses:**

*Customer Unauthorized (403):*
```json
{
  "error": "Resource Not Found",
  "message": "Customers may only leave their own active waitlist entry.",
  "status_code": 403,
  "service": "occupie-api"
}
```

*Invalid Transition (409):*
```json
{
  "error": "Conflict",
  "message": "A waitlist entry cannot move from seated to waiting.",
  "status_code": 409,
  "service": "occupie-api"
}
```

**Notes:**
- Customers can only set `status='cancelled'` on their own entries
- Staff can transition between `waiting` and `ready`
- Use dedicated `/waitlist/{id}/seat` endpoint for seating
- Records audit event: `waitlist.status_changed`

**Implementation:** `backend/app/routes/operations.py` line 559

---

### 6.4 Seat Waitlist Party

Assign table to waitlist party and mark as seated.

**Endpoint:** `POST /api/v1/waitlist/{entryId}/seat`  
**Authentication:** JWT required  
**Permissions:** Manager, Host only  

**Request Body:**

*With Specific Table:*
```json
{
  "tableId": "T05"
}
```

*Auto-Allocate Table:*
```json
{}
```

**Field Validation:**
- `tableId`: Optional, must be valid table ID if provided

**Success Response (200):**
```json
{
  "waitlistEntry": {
    "id": "WL-12345678",
    "partyName": "Smith Party",
    "partySize": 3,
    "contact": "555-9876",
    "status": "seated",
    "waitMinutes": 18,
    "quotedWait": null,
    "position": null,
    "table": "T05",
    "createdAt": "2026-10-10T18:45:00Z"
  },
  "table": {
    "id": "T05",
    "name": "Table 5",
    "capacity": 4,
    "section": "Main Dining",
    "status": "occupied",
    "assignedServer": "Alice Smith",
    "partySize": 3,
    "timeSeated": "2026-10-10T19:03:00Z"
  }
}
```

**Error Responses:**

*Not Seatable Status (409):*
```json
{
  "error": "Conflict",
  "message": "Only a waiting or ready party can be seated.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Priority Violation (409):*
```json
{
  "error": "Conflict",
  "message": "Jones Party has waited longer and can be seated now.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*No Suitable Table (409):*
```json
{
  "error": "Conflict",
  "message": "No suitable table is available for this party.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Selected Table Unavailable (409):*
```json
{
  "error": "Conflict",
  "message": "Selected table is unavailable or too small for this party.",
  "status_code": 409,
  "service": "occupie-api"
}
```

*Table Held for Reservation (409):*
```json
{
  "error": "Conflict",
  "message": "Selected table is being held for an upcoming reservation.",
  "status_code": 409,
  "service": "occupie-api"
}
```

**Priority Enforcement:**
- System identifies oldest serviceable party (oldest `created_at` with available table)
- If selected party is NOT the next serviceable, returns 409 with who should be seated first
- Ensures FIFO queue fairness

**Transaction:**
1. Validate entry status (`waiting` or `ready`)
2. Check priority (must be oldest serviceable)
3. Allocate table (or validate provided table)
4. Lock table with `FOR UPDATE`
5. Update table: `status='occupied'`, `party_size`, `time_seated`
6. Update waitlist: `status='seated'`, `table_id`
7. Record dual audit events
8. Commit transaction

**Notes:**
- If `tableId` omitted, uses adaptive allocation engine
- Uses row-level locking for concurrency safety
- Removes party from active waitlist (status='seated')
- Records audit events: `table.status_changed`, `waitlist.seated`

**Implementation:** `backend/app/routes/operations.py` line 594

---

## 7. Allocation Endpoints

### 7.1 Get Seating Recommendations

Get optimal table recommendations using adaptive scoring.

**Endpoint:** `GET /api/v1/allocations/recommend`  
**Authentication:** JWT required  
**Permissions:** All roles  

**Query Parameters:**
- `party_size` (required): Positive integer, number of guests
- `at` (optional): ISO 8601 datetime, defaults to current time
- `preferred_section` (optional): Preferred table section, ≤80 characters
- `return_alternatives` (optional): If `'true'`, returns all ranked candidates
- `use_legacy` (optional): If `'true'`, uses legacy deterministic allocator

**Request Example:**
```
GET /api/v1/allocations/recommend?party_size=4&at=2026-10-12T19:30:00Z&preferred_section=Patio&return_alternatives=true
```

**Success Response (200) - Adaptive Scoring:**
```json
{
  "available": true,
  "recommendation": {
    "id": "T08",
    "name": "Table 8",
    "capacity": 4,
    "section": "Patio",
    "status": "available"
  },
  "primaryRecommendation": {
    "table": {
      "id": "T08",
      "name": "Table 8",
      "capacity": 4,
      "section": "Patio",
      "status": "available",
      "assignedServer": "Alice Smith",
      "partySize": 0,
      "timeSeated": null
    },
    "score": 1.0,
    "factors": {
      "capacityFit": 1.0,
      "waitImpact": 1.0,
      "idleTime": 0.6500,
      "revenueOpportunity": 1.0
    },
    "reason": "Best match: perfect capacity match; no impact on upcoming reservations; table recently became available; excellent revenue optimization."
  },
  "alternatives": [
    {
      "table": {
        "id": "T09",
        "name": "Table 9",
        "capacity": 6,
        "section": "Patio",
        "status": "available"
      },
      "score": 0.7250,
      "factors": {
        "capacityFit": 0.6500,
        "waitImpact": 1.0,
        "idleTime": 0.5000,
        "revenueOpportunity": 0.6667
      },
      "reason": "Strong alternative: good fit (2 extra seats); no impact on upcoming reservations; table has been underutilized."
    }
  ],
  "strategy": "adaptive_scoring",
  "configuration": {
    "reservationHoldMinutes": 90,
    "gracePeriodMinutes": 15,
    "maxCapacityWaste": 4,
    "maxWaitImpactMinutes": 60,
    "maxIdlePenaltyMinutes": 120,
    "averagePartySpendPerPerson": 35.0,
    "weights": {
      "capacityFit": 0.4,
      "waitImpact": 0.3,
      "idleTime": 0.2,
      "revenueOpportunity": 0.1
    }
  }
}
```

**Success Response (200) - No Available Table:**
```json
{
  "available": false,
  "recommendation": null,
  "primaryRecommendation": null,
  "alternatives": [],
  "message": "No suitable table is currently available. Occupied table turnover is not predicted.",
  "strategy": "adaptive_scoring",
  "configuration": { /* ... */ }
}
```

**Success Response (200) - Legacy Mode:**
```json
{
  "available": true,
  "recommendation": {
    "id": "T08",
    "name": "Table 8",
    "capacity": 4,
    "section": "Patio",
    "status": "available"
  },
  "strategy": "legacy_deterministic"
}
```

**Error Responses:**

*Invalid Party Size (422):*
```json
{
  "error": "Validation Error",
  "message": "party_size must be a positive integer.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "party_size": "Enter a value greater than zero."
  }
}
```

*Invalid Datetime (422):*
```json
{
  "error": "Validation Error",
  "message": "startsAt must be an ISO 8601 datetime.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "at": "startsAt must be an ISO 8601 datetime."
  }
}
```

**Adaptive Scoring Factors:**

1. **Capacity Fit (weight: 0.40)**:
   - Perfect match (party == capacity): 1.0
   - Wasted seats penalized: 1.0 - (waste / max_waste * 0.7)
   - Undersized table: 0.0

2. **Wait Impact (weight: 0.30)**:
   - Estimates dining duration: 45min + 10min per person
   - Checks conflicts with upcoming reservations
   - No conflicts: 1.0
   - Near conflicts: scaled down to 0.5

3. **Idle Time (weight: 0.20)**:
   - Never used: 1.0
   - Long idle (120+ min): ≥0.9
   - Recently used (< 10min): < 0.3

4. **Revenue Opportunity (weight: 0.10)**:
   - Party revenue / potential full capacity revenue
   - 100% utilization: 1.0
   - 50% utilization: 0.5

**Section Preference Bonus:**
- If `preferred_section` matches table section: +0.1 to score (max 1.0)

**Feasibility Filtering:**
- Status must be `'available'`
- Capacity must be ≥ `party_size`
- Not held for reservation within 90-minute window

**Notes:**
- Default uses adaptive scoring (new SeatSync engine)
- Legacy mode available for backward compatibility (`use_legacy=true`)
- Recommendation is snapshot in time (recheck before confirming)
- Response includes both legacy `recommendation` and new `primaryRecommendation` for compatibility

**Implementation:** `backend/app/routes/operations.py` line 558

---

## 8. Error Response Format

### Standard Error Structure

All error responses follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable description",
  "status_code": 400,
  "service": "occupie-api",
  "fields": {
    "fieldName": "Field-specific error message"
  }
}
```

### Error Types by Status Code

**400 Bad Request:**
```json
{
  "error": "Bad Request",
  "message": "Content-Type must be application/json."
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Your session has expired. Sign in again."
}
```

**403 Forbidden:**
```json
{
  "error": "Resource Not Found",
  "message": "You do not have permission to perform this operation."
}
```

**404 Not Found:**
```json
{
  "error": "Resource Not Found",
  "message": "The requested resource was not found."
}
```

**409 Conflict:**
```json
{
  "error": "Conflict",
  "message": "A record with that identifier already exists."
}
```

**422 Validation Error:**
```json
{
  "error": "Validation Error",
  "message": "partySize must be a positive integer.",
  "status_code": 422,
  "service": "occupie-api",
  "fields": {
    "partySize": "Enter a value greater than zero.",
    "startsAt": "Choose a future time."
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred."
}
```

---

## 9. Rate Limiting

### Protected Endpoints

**Registration:**
- **Limit:** 5 requests per hour per IP
- **Header:** `X-RateLimit-Limit: 5`
- **Reset:** Rolling window

**Login:**
- **Limit:** 10 requests per 15 minutes per IP
- **Header:** `X-RateLimit-Limit: 10`
- **Reset:** Rolling window

### Rate Limit Headers

When rate limited:
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1728565200
Retry-After: 3600
```

### Rate Limit Response

```json
{
  "message": "Too many requests. Please try again later."
}
```

### Storage

- **Development:** In-memory (single instance)
- **Production:** Redis-backed (distributed)

---

## 10. Testing Examples

### Example 1: Complete Booking Flow (cURL)

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPassword123!"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# 3. Get Recommendations
curl http://localhost:5000/api/v1/allocations/recommend?party_size=4&at=2026-10-12T19:30:00Z \
  -b cookies.txt

# 4. Create Reservation
curl -X POST http://localhost:5000/api/v1/reservations \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: <csrf-from-cookie>" \
  -b cookies.txt \
  -d '{"partySize":4,"startsAt":"2026-10-12T19:30:00Z","tableId":"T08"}'
```

### Example 2: Python Requests

```python
import requests

# Session maintains cookies
session = requests.Session()

# Login
response = session.post('http://localhost:5000/api/auth/login', json={
    'email': 'test@example.com',
    'password': 'TestPassword123!'
})
user = response.json()['user']
csrf_token = session.cookies.get('occupie_csrf_access')

# Create Table
response = session.post('http://localhost:5000/api/v1/tables', 
    json={
        'id': 'T99',
        'name': 'Test Table',
        'capacity': 4,
        'section': 'Test Section'
    },
    headers={'X-CSRF-TOKEN': csrf_token}
)
print(response.json())

# Logout
session.post('http://localhost:5000/api/auth/logout',
    json={},
    headers={'X-CSRF-TOKEN': csrf_token}
)
```

### Example 3: JavaScript Fetch

```javascript
// Login
const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })
});
const { user } = await loginResponse.json();

// Get CSRF Token
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('occupie_csrf_access='))
  ?.split('=')[1];

// Create Reservation
const reservationResponse = await fetch('http://localhost:5000/api/v1/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    partySize: 4,
    startsAt: '2026-10-12T19:30:00Z',
    tableId: 'T08',
    seatingPreference: 'Patio'
  })
});
const { reservation } = await reservationResponse.json();
```

---

## Summary

This file is a detailed reference snapshot with a current-code addendum, not a complete generated endpoint inventory. Check the registered Flask routes when examples conflict; the addendum records the routes verified in the 2026-10-11 audit.

**Key Characteristics:**
- ✅ RESTful design principles
- ✅ JWT cookie-based authentication
- ✅ CSRF protection on mutations
- ✅ Role-based authorization
- ✅ Comprehensive validation
- ✅ Consistent error format
- ✅ Rate limiting on auth endpoints
- ✅ Tenant-scoped operations

**Related Documentation:**
- [Complete Project Report](./OCCUPIE_COMPLETE_PROJECT_REPORT.md)
- [Architecture and Data Flow](./ARCHITECTURE_AND_DATA_FLOW.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Setup Guide](./SETUP_AND_TROUBLESHOOTING.md)

**Source Code:**
- Routes: `backend/app/routes/auth.py`, `backend/app/routes/operations.py`
- Models: `backend/app/models/`
- Tests: `backend/tests/` (87 passing tests in the 2026-10-11 audit)

## Current audit addendum (2026-10-11)

The following registered routes are now available under `/api/v1`. All require JWT authentication and restaurant scoping; mutating requests require the CSRF header/cookie pair described above. Role names below mean membership roles for the selected restaurant.

| Route | Allowed role | Behavior |
|---|---|---|
| `GET /settings/allocation` | Manager, Host | Read `turnTimeMinutes`, `reservationHoldMinutes`, `gracePeriodMinutes`, and `utilizationTargetPercent`. |
| `PATCH /settings/allocation` | Manager | Update one or more supported integer settings. Bounds: turn 15–360, hold 0–360, grace 0–120, utilization target 1–100. |
| `GET /reports/shift` | Manager | Current table/reservation/waitlist counts, current occupied-table utilization, target comparison, and recorded average turn duration from completed reservations with both timestamps. Not a date-filtered historical report. |
| `GET /reports/export.csv` | Manager | Download current restaurant table, reservation, and waitlist records as CSV. |
| `POST /tables/import` | Manager | Body `{ "csv": "id,name,capacity,section\\nT01,Table 1,4,Main" }`; insert-only, 1–500 rows, under 1 MB. Existing or duplicate IDs reject the batch. |
| `POST /allocations/simulate` | Manager | Body `{ "parties": [{"partyId":"P1","partySize":2,"at":"2026-10-12T19:00:00Z"}] }`; 1–20 parties. Returns `simulation` and `persisted:false`; it does not save assignments. |
| `POST /reservations/{id}/reassignment` | Host, Manager | Request `{ "tableId":"T02", "reason":"Optional reason" }`; creates a pending manager review after validating target fit and availability. |
| `GET /reassignments` | Manager | List pending reassignment requests for the restaurant. |
| `PATCH /reassignments/{id}/status` | Manager | Body `{ "status":"approved" }` or `{"status":"rejected"}`. Approval rechecks the reservation and target table before changing its assignment. |

Reservation status values include `confirmed`, `checked_in`, `seated`, `completed`, `cancelled`, and `no_show`. Completing a seated reservation stores `completedAt` and moves its occupied table to `cleaning`. No-show is rejected until the configured grace period after the reservation start has elapsed.

Table status values are `available`, `occupied`, `reserved`, and `cleaning`. The operations API enforces the state machine and party-size capacity on occupied transitions. Floor-staff access is limited by an exact match between the free-form table `assignedServer` name and the authenticated user's display name; it is not an identity foreign key.

Allocation uses a persisted restaurant hold time and turn time to test overlap between reservation and proposed seating intervals. It selects one table at a time; joined tables and occupied-table turnover predictions are not implemented. The manager report has no revenue history, and the allocator's revenue-opportunity score is heuristic only.

The migration head for these endpoints is `a6b7c8d9e012`; run `flask --app run db upgrade` before using the new schema-backed routes. A fresh SQLite upgrade to this revision passed in the audit. PostgreSQL migration, production CORS, and deployment were not verified.
