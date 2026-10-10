# Local Development and Deployment Setup

## Prerequisites

- Node.js 18+ and npm 9+
- Python 3.11+
- PostgreSQL 14+ for a PostgreSQL environment (local development can use SQLite)

## Backend

PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
flask db upgrade
python run.py
```

The development API is at `http://localhost:5000`; health is `GET /api/v1/health`. If `DATABASE_URL` is empty, development uses `backend/instance/occupie_dev.db`. Set a PostgreSQL URL before `flask db upgrade` when using PostgreSQL. Production refuses to start with SQLite.

## Frontend

In a second terminal:

```powershell
cd frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open `http://localhost:5173`. The frontend sends `/api/*` requests through Vite's development proxy to Flask at `http://127.0.0.1:5000`; start both servers. Set `VITE_API_PROXY_TARGET` if Flask uses a different host or port. Set `VITE_DATA_MODE=demo` only to explicitly preview local fixtures, then restart Vite.

## Staff provisioning

> **Current account behavior:** registration creates a customer account immediately. Email verification, password recovery, and refresh-token endpoints are not part of the current authentication flow. See [api-contract.md](api-contract.md) for the current contract.

Public registration always creates a customer. Create staff accounts only from a trusted backend terminal after migrating the database:

```powershell
cd backend
flask provision-staff --name "Restaurant Manager" --email manager@example.com --role manager
```

The CLI securely prompts for the password and assigns a restaurant membership. Roles are `manager`, `host`, or `floor_staff`. The default restaurant ID comes from `DEFAULT_RESTAURANT_ID` (defaults to `default`); the CLI creates it if it does not exist. Use `--restaurant-id` to assign staff to an existing restaurant.

## Environment variables

Copy the examples to local `.env` files. `.gitignore` excludes actual environment files.

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `FLASK_ENV` | `development` or `production` |
| `SECRET_KEY` | Flask signing secret; use a random value of at least 32 characters in production |
| `JWT_SECRET_KEY` | Separate JWT signing secret; use a random value of at least 32 characters in production |
| `DATABASE_URL` | SQLAlchemy URL; blank uses SQLite in development, production requires PostgreSQL |
| `FRONTEND_ORIGINS` | Comma-separated exact browser origins allowed by credentialed CORS |
| `COOKIE_SECURE` | Set `true` over HTTPS in production |
| `DEFAULT_RESTAURANT_ID` | Default tenant for requests that do not select a restaurant |
| `RATELIMIT_STORAGE_URI` | Local default is `memory://`; use shared Redis storage in production, e.g. `redis://localhost:6379/0` |
| `HOST`, `PORT` | Server bind settings |

Example PostgreSQL URL:

```text
postgresql+psycopg2://occupie_user:replace-me@localhost:5432/occupie_db
```

In production, configure `COOKIE_SECURE=true`, a PostgreSQL `DATABASE_URL`, both secrets, and shared rate-limit storage. `run.py` serves production traffic with Waitress. Put it behind a TLS-terminating reverse proxy and set `FRONTEND_ORIGINS` to the actual HTTPS origin. Do not use Flask's development server in production.

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Operations API base, normally `/api/v1` for the local Vite proxy |
| `VITE_AUTH_API_URL` | Auth API base, normally `/api/auth` for the local Vite proxy |
| `VITE_API_PROXY_TARGET` | Flask origin Vite proxies to during development; defaults to `http://127.0.0.1:5000` |
| `VITE_DATA_MODE` | `api` by default; choose `demo` explicitly for fixtures |
| `VITE_OCCUPIE_CHAT_WEBHOOK` | Optional existing chat endpoint; leave blank to use its configured app default |

## Database migrations

Run `flask db upgrade` after setting backend environment variables. The committed initial revision creates all required tables on a new database and adds auth and restaurant scoping columns to the original development schema while keeping existing records. Check status with `flask db current` and inspect future changes with `flask db migrate -m "description"` before applying them.

Development app startup can create missing tables for convenience, but it does not replace migration commands for schema changes. Take a database backup before production migrations.

## Authentication

Authentication consists of customer registration, login, logout, and `GET /api/auth/me`. It uses a short-lived HTTP-only access cookie and a CSRF cookie/header for writes. Email verification, password reset, and refresh-token routes have been removed. Existing database columns and migration history for those retired flows are retained without modification; no cleanup migration is required to run the simplified flow.

## Tests and build

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v

cd ..\frontend
npm test
npm run build
```

The backend suite uses in-memory SQLite by default. For PostgreSQL-specific concurrency validation, set `TEST_DATABASE_URL` to an isolated test database before running tests; never point it at production data.
