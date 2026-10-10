# Local Development Setup

## Prerequisites

- Node.js 18+ and npm 9+
- Python 3.11+
- PostgreSQL 14+ only if using PostgreSQL; development defaults to SQLite

## Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

`frontend/.env.example` sets:

```ini
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_DATA_MODE=demo
```

Demo mode is explicit, uses fixture data, and resets in-memory changes after a page reload. To use the persisted Flask API, change `VITE_DATA_MODE=api` and restart Vite. In API mode, loading and operation failures are shown; the frontend does not fall back to fixture data.

## Backend

### Windows PowerShell

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python run.py
```

### macOS / Linux

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py
```

The API is available at `http://localhost:5000`; health is `GET /api/v1/health`. Development uses `backend/instance/occupie_dev.db` when `DATABASE_URL` is empty. Set a PostgreSQL URL to retain PostgreSQL. `run.py` creates missing tables for local development, but does not alter an existing schema.

After both servers are running, set `VITE_DATA_MODE=api` in the frontend `.env`, restart Vite, and open the Manager dashboard to add tables. The host, customer, and floor workflows then use the configured API.

## Environment variables

Backend `.env`:

```ini
FLASK_ENV=development
SECRET_KEY=replace-with-a-long-random-string
JWT_SECRET_KEY=replace-with-a-different-long-random-string
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL=
PORT=5000
HOST=0.0.0.0
```

`DATABASE_URL` may be empty for SQLite. To use PostgreSQL, set a URL such as `postgresql://occupie_user:password@localhost:5432/occupie`. Production startup requires `SECRET_KEY` and `JWT_SECRET_KEY` values of at least 32 characters plus `DATABASE_URL`; example placeholders are rejected.

Frontend `.env`:

```ini
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_DATA_MODE=demo
```

Do not commit `.env` files; `.gitignore` excludes them. The example files contain no real credentials.

## Database schema

Development `run.py` creates missing tables at startup. It does not update an existing database schema. Flask-Migrate is installed, but no initial migration is committed yet. Before production, review and commit the initial migration, then use `flask db upgrade` for schema changes rather than relying on `create_all()`.

## Tests and build

```powershell
cd frontend
npm test
npm run build

cd ../backend
.\venv\Scripts\python.exe -m pytest -v
```

Backend tests use an in-memory SQLite database and do not require PostgreSQL.

## Current limitations

- Login and role switching are a demo shell. No authentication or backend role authorization exists.
- API mode persists tables, reservations, waitlist entries, and seating state. It does not provide analytics, revenue metrics, notification delivery, or push updates.
- Current records represent one demo restaurant; multi-tenant data isolation is not implemented.
- The allocation rule is deterministic and documented in [API_CONTRACT.md](API_CONTRACT.md). It does not predict when occupied tables will clear and does not promise a wait time.
- Do not deploy the current API where untrusted users can access it until authentication, role authorization, migrations, and production server configuration are complete.
