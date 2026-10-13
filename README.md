# Occupie — Restaurant Seating Operations

## Release readiness: Ready with limitations

The 2026-10-11 audit recorded a passing frontend production build, **87 backend tests**, and **38 frontend tests**. Browser checks using disposable SQLite data covered all four role workspaces, customer booking, and a floor-staff table update. A fresh demo seed created three completed visits and five confirmed bookings; a second run added no duplicate rows.

The default local SQLite database was subsequently backed up to `backend/instance/occupie_dev.before-run-20261011-034400.db` and migrated from `e880f4e1dce4` to `a6b7c8d9e012` before the app was started. Other demo databases still need their own backup and migration. PostgreSQL, production deployment, and target-environment CORS remain unverified. CSV import/export and reassignment approval still need browser walkthroughs; live updates, predicted wait times, revenue history, and combined-table bookings are not implemented.

See the [final readiness audit](docs/FINAL_READINESS_AUDIT.md) for evidence and the [feature gap audit](docs/FEATURE_GAP_AUDIT.md) for the feature-by-feature status.

Occupie is a restaurant seating operations prototype for coordinating tables, reservations, walk-ins, and service updates. It provides separate workspaces for managers, hosts, floor staff, and customers.

> **📚 New to Occupie?** See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for a complete guide to all documentation, or jump to [DEMO_RESOURCES.md](DEMO_RESOURCES.md) for presentation materials.

## Technology Stack

### Backend
- **Flask 3.x** and **Flask-SQLAlchemy 3.1+** — API and ORM; lower bounds are in `backend/requirements.txt`
- **Flask-JWT-Extended 4.5+** — Cookie-based authentication with CSRF protection
- **Flask-Migrate** — Database migrations via Alembic
- **Python 3.11+** — Local setup prerequisite

### Frontend
- **React 18.3** — Component-based UI library
- **Vite 5.4** — Fast build tool and dev server
- **TailwindCSS 3.4** — Utility-first CSS framework
- **React Router 6.28+** — Client-side routing with protected routes
- Browser `fetch` through `frontend/src/services/api.js` — credentialed API client (Axios is not a dependency)

## Key Features

### Multi-Tenant Restaurant Management
- Backend restaurant scoping and table configuration; the browser UI uses the configured default restaurant and has no tenant picker
- Role-based access control (Manager, Host, Floor Staff, Customer)
- Staff membership provisioning through a trusted CLI

### Reservation System
- Customer self-service booking
- API-checked availability and a server recheck when a reservation is saved
- Reservation statuses: `confirmed`, `checked_in`, `seated`, `completed`, `cancelled`, and `no_show` (`pending` is not a stored status)
- Single-table allocation ranked by fit and configured reservation windows; tables are not combined

### Waitlist Management
- Walk-in customer queuing
- Priority-based ordering
- Elapsed queue time and position where returned by the API; future wait estimates are not available
- Direct table allocation from waitlist

### Table Operations
- Table status tracking (`available`, `occupied`, `reserved`, `cleaning`; `maintenance` is not a status)
- Section-grouped visual table map (not a spatial or draggable floor-plan editor)
- Capacity and party size matching
- Recorded turn duration from completed reservation timestamps; occupied-table turnover is not predicted

### Security & Compliance
- HTTP-only cookies with SameSite protection
- CSRF token validation
- Rate limiting on authentication endpoints
- Audit logging for operational events
- Password hashing with Werkzeug security

## Quick Start

### Backend Setup (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
flask --app run db upgrade
python run.py
```

The API runs at `http://localhost:5000`. Local development uses SQLite by default. For PostgreSQL, set `DATABASE_URL` in `backend/.env` before running migrations.

### Frontend Setup (PowerShell)

```powershell
cd frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite development proxy sends `/api/*` requests to Flask at `http://127.0.0.1:5000`.

---

## 🎯 Demo Mode (For Presentations & Judges)

**Want to quickly demonstrate Occupie with realistic data?**

### Quick Demo Setup
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python seed_demo_data.py
python run.py
```

On a fresh local database this inserts 12 tables, three staff accounts, nine customers, eight reservations (three completed and five upcoming), and three waitlist entries. It inserts only missing demo IDs and never deletes or overwrites existing rows. The seed script preserves the configured default restaurant's name; a fresh migrated database uses **Occupie Restaurant**. Use a disposable local database for a demo, and never seed production.

### Demo Login Credentials
| Local demo role | Email | Password |
|------|-------|----------|
| Manager | `manager@goldenfork.com` | `Manager123!` |
| Host | `host@goldenfork.com` | `Host123!` |
| Floor Staff | `staff@goldenfork.com` | `Staff123!` |
| Customer | `sarah.johnson@email.com` | `Customer123!` |

### Demo Resources
- 📖 **[DEMO_RESOURCES.md](DEMO_RESOURCES.md)** — Complete demo guide with all materials
- 🖨️ **[DEMO_QUICK_REFERENCE.md](docs/DEMO_QUICK_REFERENCE.md)** — Printable credentials & 5-min script
- ✅ **[PRE_DEMO_CHECKLIST.md](docs/PRE_DEMO_CHECKLIST.md)** — Setup verification checklist
- 🎬 **[DEMO_AND_PRESENTATION_GUIDE.md](docs/DEMO_AND_PRESENTATION_GUIDE.md)** — Detailed walkthrough scenarios

**5-Minute Demo Flow:**
1. Login as customer → Show reservation
2. Login as host → Seat a walk-in using the server's table recommendation
3. Login as floor staff → Mark table available
4. Login as manager → Review the current-state shift report and run a what-if allocation

---

## User Roles and Permissions

### Customer
- Register and log in via public UI
- Create and manage personal reservations
- View reservation history and status
- Cancel upcoming reservations

### Host
- View API-loaded table status (the UI refreshes after actions; there is no live push channel)
- Manage waitlist entries
- Seat customers from waitlist or reservations
- Update table status

### Floor Staff
- View tables whose free-form assigned staff name exactly matches the account display name
- Update assigned table states through the service lifecycle

### Manager
- Manage restaurant tables and allocation settings
- View a current-state operational report, export operational CSV, import tables by CSV, and run a non-persistent allocation simulation

## Staff Provisioning

Staff accounts are created via CLI to ensure security:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
flask --app run provision-staff --name "Restaurant Manager" --email manager@example.com --role manager
```

Supported roles: `manager`, `host`, `floor_staff`

## Testing and Quality Assurance

### Current verification (2026-10-11)
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

Latest run: backend pytest **87 passed**, frontend Vitest **38 passed**, and `npm run build` **passed**. The automated tests use SQLite; the production PostgreSQL deployment and concurrency behavior have not been tested.

### Frontend Build
```powershell
cd frontend
npm run build
```

## Documentation

### Comprehensive Guides
- **[OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md)** — Project report (the current file contains Chapters 1-6 only)
- **[ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md)** — System architecture, data flows, ERD, state diagrams, and deployment architecture
- **[API_REFERENCE.md](docs/API_REFERENCE.md)** — API reference snapshot with a current audit addendum; verify against registered routes
- **[DEMO_AND_PRESENTATION_GUIDE.md](docs/DEMO_AND_PRESENTATION_GUIDE.md)** — 📊 Demo walkthrough, sample data, presentation scripts, and Q&A preparation

### Setup and Operations
- **[SETUP.md](docs/SETUP.md)** — Environment configuration, PostgreSQL setup, and production deployment
- **[TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md)** — Development workflow and Git practices

### Technical Reference
- **[API_CONTRACT.md](docs/API_CONTRACT.md)** — API contract specifications
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Core architecture and design decisions
- **[IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md)** — Feature implementation status

### Project Reports
- **[SEATSYNC_ACCEPTANCE_REPORT.md](docs/SEATSYNC_ACCEPTANCE_REPORT.md)** — Project acceptance and evaluation report
- **[NAVIGATION_STATUS.md](docs/NAVIGATION_STATUS.md)** — Navigation implementation status
- **[ROUTE_DIRECTORY.md](docs/ROUTE_DIRECTORY.md)** — Frontend routing structure

## Database Schema

The system uses 10 primary models:

1. **User** — Authentication and profile data
2. **Restaurant** — Multi-tenant restaurant entities
3. **RestaurantMembership** — Role-based staff assignments
4. **RestaurantTable** — Physical table configuration
5. **Reservation** — Customer booking records
6. **WaitlistEntry** — Walk-in queue management
7. **RestaurantSettings** — Persisted allocation and arrival rules
8. **ReservationReassignment** — Host table-change request and manager review
9. **RevokedToken** — JWT revocation for logout
10. **AuditEvent** — Operational event logging

## Adaptive Allocation Engine

The server-side allocator ranks available single tables by capacity fit, preferred section, and heuristic factors. It uses each restaurant's configured reservation hold and turn-time settings when checking overlapping reservation intervals. Its score includes a fixed heuristic revenue-opportunity factor; this is not revenue tracking or a revenue report. Settings include turn time, reservation hold, no-show grace, and utilization target.

See `backend/app/services/adaptive_allocation.py` and [the feature gap audit](docs/FEATURE_GAP_AUDIT.md) for implementation details and limits.

## Known limits

- No live push updates, predicted wait times, occupied-table turnover prediction, reservation lifecycle notifications, or revenue history.
- The shift report is a current database snapshot with a recorded average from completed reservations; it is not a date-filtered historical analytics service.
- Floor-staff assignment is matched against a free-form display name, not a staff identity foreign key.
- The frontend has no restaurant picker and uses the configured default restaurant.
- Production deployment, PostgreSQL migrations, and PostgreSQL concurrency have not been exercised in this audit.

## Production Deployment

### Vercel Deployment (Recommended)

Occupie is optimized for deployment on Vercel with automatic scaling and global CDN.

**Quick Deploy:**
1. Push code to GitHub
2. Import repository to [Vercel](https://vercel.com/new)
3. Add environment variables (see `.env.vercel.example`)
4. Deploy!

**Complete Guide:** See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)  
**Deployment Checklist:** See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

**Architecture:**
- **Frontend:** Static site (Vite build) on Vercel CDN
- **Backend:** Serverless functions (Python/Flask) on Vercel
- **Database:** Vercel Postgres or external PostgreSQL
- **Routing:** `/api/*` → Backend | Everything else → Frontend

**Monthly Cost Estimate:**
- Small restaurant (1 location): **Free tier** (sufficient)
- Restaurant chain (3-10 locations): **$40/month** (Vercel Pro + Postgres)

---

## Security Features

- HTTP-only cookies with CSRF protection
- Secure password hashing (Werkzeug + salt)
- Role-based authorization at API level
- Input validation and sanitization
- Rate limiting on sensitive endpoints
- Audit logging for compliance
- Production configuration checks for PostgreSQL, HTTPS cookies, explicit secrets, and shared Redis rate-limit storage; deployment itself has not been verified

## Production deployment status

The code has a Waitress startup path and rejects a production configuration without PostgreSQL, strong explicit secrets, `COOKIE_SECURE=true`, and shared Redis rate-limit storage. A complete production deployment has not been performed or verified. Configure an exact HTTPS `FRONTEND_ORIGINS` value, apply migrations to a backed-up target, build and serve the frontend, and validate the deployment before making production-readiness claims. See [SETUP.md](docs/SETUP.md).

## Project Status

✅ **Backend and frontend test suites passed in the 2026-10-11 audit (87 and 38 tests)**
✅ **Frontend production build passed in the audit**
✅ **Customer, host, floor staff, and manager workspaces and server-side permissions verified**
✅ **Reservation, waitlist, table, settings, reporting, and reassignment workflows have automated coverage**
⚠️ **PostgreSQL deployment and production operations still require validation**

## Contributing

See [TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) for development practices and Git workflow.

## License

Proprietary — All rights reserved
