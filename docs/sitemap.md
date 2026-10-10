# Occupie sitemap

This sitemap reflects the routes in `frontend/src/routes/AppRoutes.jsx` and the current `ROLE_NAVIGATION` entries in `frontend/src/lib/constants.js`.

## Public and account routes

| URL | Page | Access and behavior |
|---|---|---|
| `/` | Landing page | Public. Sign-in and workspace links lead to `/auth/login`. |
| `/auth/login` | Sign in | Public. Successful login routes to the role returned by the API. |
| `/auth/register` | Create account | Public customer registration. |
| `/auth/verify` | Legacy route | Redirects to `/auth/login`; email verification is not supported. |
| `/auth/forgot-password` | Legacy route | Redirects to `/auth/login`; password recovery is not supported. |
| `/auth/reset-password` | Legacy route | Redirects to `/auth/login`; password recovery is not supported. |
| `/auth/demo-roles` | Demo role preview | Development demo mode only. Redirects to login in API mode. Changing roles here selects local preview data and is not real authentication. |

Unknown paths redirect to `/`.

## Public-page navigation

The landing page has in-page navigation rather than additional React routes:

| Navigation label/action | Destination |
|---|---|
| Product | Landing page section `#product` |
| Experience | Landing page section `#experience` |
| About | Landing page section `#about` |
| Sign in | `/auth/login` |
| Enter the workspace (header and closing CTA) | `/auth/login` |
| Explore the operating room | `/auth/login` |

The mobile landing menu repeats Product, Experience, About, Sign in, and Enter the workspace. The login page links to `/auth/register`; the registration page links back to `/auth/login`. In demo mode only, Login also links to `/auth/demo-roles`; the role selection page links back to `/` and `/auth/login`.

## Shared dashboard shell

All `/dashboard/*` destinations render inside `DashboardLayout`: a role banner, `Sidebar`, `Topbar`, and the active page in the main content area. Sidebar links either open a dashboard URL or scroll to a section anchor on the active dashboard. The layout supports a mobile sidebar and closes it on Escape.

The shared top bar's Landing Page link returns to `/`. Its mobile button opens/closes the sidebar. The sidebar user card exposes Sign out in API mode and Switch preview role in demo mode. `RoleSwitcherBanner` shows the authenticated role in API mode; in demo mode it offers role-switch buttons that open each workspace.

`/dashboard` is an index redirect. After session restoration it redirects to the authenticated user's role route; signed-out users go to `/auth/login`.

## Restaurant Manager workspace

**Workspace:** `/dashboard/manager`  
**Required API role:** `manager` membership for the selected restaurant.

| Sidebar item | Destination | Current content/action |
|---|---|---|
| Manager Dashboard | `/dashboard/manager` | Current table, reservation, and waitlist overview. |
| Table and Section Setup | `/dashboard/manager#tables` | View floor-plan table state and create tables. Sections are stored as table labels, not a separate section entity. |
| Reservations Overview | `/dashboard/manager#reservations` | View loaded reservations and perform supported status actions. |
| Analytics | `/dashboard/manager#analytics` | Current-record KPI cards. Live historical/revenue analytics are not provided by an API. |
| Shift Reports | `/dashboard/manager#shift-report` | Download a client-generated CSV from loaded operational records. |

The page also contains a reports card at `#reports`; it is not a separate route or sidebar destination.

## Receptionist / Host workspace

**Workspace:** `/dashboard/host`  
**Required API role:** `host` membership for the selected restaurant.

| Sidebar item | Destination | Current content/action |
|---|---|---|
| Host Dashboard | `/dashboard/host` | Reservation, waitlist, availability, and recommendation view. |
| Reservations | `/dashboard/host#reservations` | Review bookings, update allowed status, and seat arrivals. |
| Walk-in Queue | `/dashboard/host#walk-in-queue` | Walk-in form and current queue. The related form is also identified as `#host-walkin-form`. |
| Waitlist | `/dashboard/host#waitlist` | Add, update, and seat waitlist parties. |
| Table Availability | `/dashboard/host#availability` | Current capacity/status overview. |
| Seating Recommendations | `/dashboard/host#seating-recommendations` | Apply the single-table fit rule to current data. |

## Floor Staff workspace

**Workspace:** `/dashboard/floor-staff`  
**Required API role:** `floor_staff` membership for the selected restaurant.

| Sidebar item | Destination | Current content/action |
|---|---|---|
| Floor Staff Dashboard | `/dashboard/floor-staff` | Current table/service view. |
| Assigned Tables | `/dashboard/floor-staff#assigned-tables` | View tables grouped by the assigned-server field where populated. |
| Table Status | `/dashboard/floor-staff#table-status` | Set table status through the protected table status endpoint. |
| Service Updates | `/dashboard/floor-staff#service-updates` | Service-oriented status controls; no separate service-event API is present. |

## Customer workspace

**Workspace:** `/dashboard/customer`  
**Required API role:** authenticated user without a staff membership for the selected restaurant.

| URL/sidebar item | Content |
|---|---|
| `/dashboard/customer` — My Dining Hub | Customer home and shortcut cards. |
| `/dashboard/customer/book` — Book a Table | Request date/time and party size, ask for an availability recommendation, then submit a reservation. |
| `/dashboard/customer/upcoming` — Upcoming Bookings | View and manage the signed-in customer's upcoming reservations and active waitlist entry. |
| `/dashboard/customer/history` — Dining History | Review the customer's reservation records and statuses. |

## Route gates and demo behavior

- API mode: `DashboardAccess` checks session state and the role returned by `/api/auth/me`. A signed-out dashboard visit redirects to `/auth/login`; a wrong-role dashboard URL redirects to the user's role route. An already authenticated API-mode visit to `/auth/login` redirects to the user's role route. `/dashboard` redirects to the authenticated role route. Backend operation permissions remain authoritative.
- Demo mode: only `/auth/demo-roles` is exposed as a role selector. The client route gate permits previewing all four dashboards, while dashboard actions use local fixtures and do not call the operations API.
- Public signup cannot choose any staff workspace. Staff accounts are provisioned using the backend CLI and restaurant membership records.
