# Occupie Project Structure

This guide maps the maintained application code. Generated bundles, installed dependencies, local environments, and runtime database files are not source directories.

```text
Occupie/
├── backend/
│   ├── app/
│   │   ├── middleware/       # Request authentication and error handling
│   │   ├── models/           # SQLAlchemy users, restaurants, tables, reservations, waitlist
│   │   ├── routes/           # Flask auth, health, operations, allocation, reservation, table APIs
│   │   ├── services/         # Table allocation policy and adaptive allocation logic
│   │   ├── config.py         # Database, cookie, CORS, and environment configuration
│   │   ├── extensions.py     # Flask extension instances
│   │   └── __init__.py       # Flask application factory and route registration
│   ├── migrations/           # Alembic environment and schema revision history
│   ├── tests/                # Backend API, auth, model, and workflow tests
│   ├── requirements.txt      # Python dependencies
│   ├── run.py                # Local Flask / production Waitress entry point
│   └── seed_demo_data.py     # Explicit demo-data setup
├── docs/                     # Setup, API, architecture, demo, and audit documents
├── frontend/
│   ├── public/               # Brand artwork, landing frames, and supplied videos
│   ├── src/
│   │   ├── components/       # Shared layout, UI, dashboard, and common components
│   │   ├── hooks/            # Role/session and operational-data state
│   │   ├── lib/              # Role and navigation constants
│   │   ├── pages/
│   │   │   ├── auth/         # Login, role selection, and auth actions
│   │   │   ├── dashboards/   # Customer, host, floor-staff, and manager workspaces
│   │   │   └── landing/      # Public landing and active cinematic brand scene
│   │   ├── routes/           # React Router route definitions and role guards
│   │   ├── services/         # Flask API client, allocation helpers, demo fixtures
│   │   ├── styles/           # Global and dashboard styling
│   │   └── __tests__/        # Frontend behavior and navigation tests
│   ├── package.json          # Frontend scripts and direct dependencies
│   ├── package-lock.json     # Reproducible npm dependency lock
│   └── vite.config.js        # Vite development proxy, build, and test configuration
├── README.md                 # Project overview, readiness summary, and quick start
└── docs/CLEANUP_REPORT.md    # Evidence and results for the cleanup pass
```

## Runtime path

The browser entry is `frontend/src/main.jsx`, which loads `App.jsx` and `routes/AppRoutes.jsx`. Role-specific dashboard routes render the corresponding dashboard inside the shared dashboard layout. API calls are made by `frontend/src/services/api.js` and proxied by Vite during local development.

The backend entry is `backend/run.py`, which creates the Flask app from `backend/app`. Alembic revisions in `backend/migrations/versions` manage the database schema; the app does not create the schema automatically at startup.

## Local-only and generated directories

`frontend/node_modules`, `frontend/dist`, `backend/.venv`, `backend/venv`, `backend/instance`, local `.env` files, and Python/pytest caches are machine-specific or generated. The installed dependencies, environments, local database and backup, and `.env` files were preserved during cleanup. Do not commit local secrets or database files.

