# Occupie — Restaurant Seating Operations

Occupie helps restaurant teams coordinate tables, reservations, walk-ins, and seating. The application uses React, Vite, and Tailwind CSS in the browser and Flask, SQLAlchemy, and PostgreSQL for the API. Local development can use SQLite.

## Start locally

### Backend (PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
flask db upgrade
python run.py
```

The API runs at `http://localhost:5000`. The checked-in environment example uses SQLite for local development. To use PostgreSQL, set `DATABASE_URL` in `backend/.env` before running migrations.

### Frontend (second terminal)

```powershell
cd frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open `http://localhost:5173`. The frontend defaults to API mode. To preview sample data without a backend, explicitly set `VITE_DATA_MODE=demo` in `frontend/.env` and restart Vite.

## Accounts and roles

Public registration creates a customer account using name, email, and password. Staff accounts are provisioned through the backend CLI; a browser-supplied role never grants staff access.

Provision operational staff from the backend terminal after migrations:

```powershell
flask provision-staff --name "Restaurant Manager" --email manager@example.com --role manager
```

The command prompts for the password and provisions the account for the configured default restaurant. Supported staff roles are `manager`, `host`, and `floor_staff`. Staff permissions come from database-backed restaurant memberships. Customers cannot assign themselves staff roles.

Authentication uses a short-lived HTTP-only access cookie with CSRF protection. The frontend restores sessions through `/api/auth/me`; there is no refresh-token, email-verification, or password-reset flow. Production requires HTTPS cookies, PostgreSQL, strong application secrets, and shared rate-limit storage such as Redis.

## Database migrations

Use `flask db upgrade` to create or update the schema. The initial migration creates the auth, membership, restaurant, table, reservation, waitlist, and token revocation structures. It also upgrades the original local SQLite schema and assigns existing operational rows to the default restaurant. Development startup retains `create_all()` as a convenience for an empty local install; schema changes should be rolled out through migrations.

## Workflows and allocation

The four existing dashboard routes remain:

- `/dashboard/manager`
- `/dashboard/host`
- `/dashboard/floor-staff`
- `/dashboard/customer`

Manager, host, floor staff, and customer operations are checked by the Flask API. Data is scoped to the selected restaurant and customer reservations are scoped to the signed-in user. The deterministic allocation rule selects the smallest suitable available table and protects confirmed reservations in the configured 90-minute window. It does not predict occupied-table turnover or promise a wait time.

## Configuration

See [docs/SETUP.md](docs/SETUP.md) for environment variables, PostgreSQL, Redis, and production setup. See [docs/api-contract.md](docs/api-contract.md) for authentication and operations endpoints and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the implementation structure.

## Verification

```powershell
cd frontend
npm test
npm run build

cd ../backend
.\venv\Scripts\python.exe -m pytest -v
```
