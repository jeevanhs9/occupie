# Occupie Cleanup Report

## Scope and preservation

This report records a conservative dead-code cleanup of the existing `E:\Occupie` checkout. The audit was performed before removals so every deletion below has recorded evidence. No database records, environment files, migrations, registered API routes, models, authentication code, working dashboards, or original public media were removed.

Before cleanup, `git status` showed branch `main` and five pre-existing modified documentation files: `README.md`, `docs/ARCHITECTURE.md`, `docs/FEATURE_GAP_AUDIT.md`, `docs/FINAL_READINESS_AUDIT.md`, and `docs/SETUP.md`. Those edits are preserved. The starting tracked-file count was 515.

## Inventory and evidence collected before removal

- Frontend production import graph before cleanup: 39 JavaScript/JSX modules total, of which 37 were reachable from `frontend/src/main.jsx`; two production JSX files were unreachable and unreferenced from all production source.
- Backend structure: Flask app factory, auth/health/operations routes, SQLAlchemy models, seven ordered Alembic revisions, tests, seed/setup scripts, and two ignored local virtual environments. The three legacy route modules described below were selected only after confirming they are unregistered and unreferenced; the active `operations.py` API is retained.
- Public assets: 366 files totaling 53,523,676 bytes (about 51.0 MiB): 120 restaurant scene frames, 120 active logo-animation frames, 120 additional logo frames, four brand/logo files, and two videos. All are retained. The current landing scene references `/frames/` and `/logo-animation-frames/`; the other frame folder and videos are not referenced by the frontend source, but are treated as original project media.
- Frontend tests and backend tests are retained. No merge conflict markers were found in frontend or backend source.
- `frontend/node_modules`, both backend virtual environments, `backend/instance` (including the local database and backup), `.env` files, `frontend/dist`, and `.impeccable` are preserved. Environment file contents were not inspected.
- Existing documentation is retained, including similarly named API documents and historical animation notes; their contents are not interchangeable based on filename alone.

## Cleanup candidates and decisions before removal

| Candidate | Evidence | Decision |
| --- | --- | --- |
| `frontend/src/pages/landing/NativeBrandAnimation.jsx` | No import in the production graph or other source; the active `BrandAnimation.jsx` renders `LogoFrameAnimation`. | Remove the unreachable component. |
| `frontend/src/pages/landing/NativeBrandAnimation.css` | No CSS import; selectors are used only by the unreachable native component. | Remove with its unreachable component. |
| `frontend/src/pages/landing/OccupieHeroLockup.jsx` | No import in the production graph or other source; no stylesheet or runtime reference. | Remove the unreachable lockup component. |
| `backend/app/routes/allocations.py`, `reservations.py`, and `tables.py` | Not imported by app startup or tests, and their blueprints are not registered. Current `/api/v1` endpoints are registered from `operations.py`; the legacy handlers use obsolete field/identifier contracts. | Remove these inactive route definitions; retain shared allocation services used by `operations.py`. |
| Frontend direct dependencies `gsap`, `recharts`, `clsx`, and `tailwind-merge` | No source imports or runtime references. `vite.config.js` only contains stale manual-chunk rules for GSAP and Recharts. | Remove the four unused direct dependencies and stale chunk rules; update the npm lockfile. |
| Python bytecode and pytest caches | Generated, ignored cache directories only. | Removal was attempted after tests but blocked by the command policy; caches remain. Installed environments and application data remain untouched. |
| Unreferenced frame folders, brand PNGs, and videos | Not required by the current frontend import graph; they are original public assets and may have non-code use. | Retain; no approval-safe basis to delete original media. |

No deletion had been made when this report was first created. The changes and verification below were completed afterward.

## Changes applied

- Removed the three confirmed-unreachable frontend files listed above. The remaining 37 production JavaScript/JSX modules are all reachable from the frontend entry point.
- Removed the three unregistered legacy backend route modules listed above. The active API remains registered from `operations.py`; the shared allocation services and all current API routes are retained. Updated the API contract, architecture, and audit documentation to point to the active implementation and marked the old animation note as historical.
- Removed direct frontend dependencies `gsap`, `recharts`, `clsx`, and `tailwind-merge`; updated `frontend/package.json` and `frontend/package-lock.json`. npm pruned 39 packages from the local install. Removed the obsolete GSAP/Recharts manual chunk entries from `frontend/vite.config.js`.
- Added this report and `docs/PROJECT_STRUCTURE.md`.
- Retained every public asset, all registered backend routes, services, models, migrations, environments, the database, and all existing user modifications.
- Starting tracked file count: 515. Six tracked files were removed and two documentation files were added, leaving 511 project files when counting the current working tree plus the new docs.
- Cache cleanup did not complete: the command runner rejected recursive removal of the verified `.pytest_cache` and `__pycache__` directories as blocked by policy. Those cache directories remain in the checkout; no retry or alternate deletion method was used.

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` in `frontend` | Passed with Vite 5.4.21; 1,973 modules transformed. |
| `npm test -- --reporter=dot` in `frontend` | Passed: 8 test files, 38 tests. This includes 13 route/navigation tests. |
| `backend/.venv/Scripts/python.exe -m pytest -q` in `backend` | Passed: 87 tests. |
| Frontend source import graph after cleanup | Passed: 37 production JavaScript/JSX modules, all reachable from the entry point. |
| Removed dependency references in package manifests, lockfile, and Vite config | None remain. `npm ls --depth=0` passes. |
| Flask route registration | `python -m flask --app run routes` succeeds after removal; auth, health, and `operations.py` blueprints remain registered, with no legacy route module. |
| Public landing assets | The referenced first/last restaurant and logo frames and both SVG logo variants exist. All 366 public files were retained. |
| Merge conflict marker scan | No markers found in frontend or backend source. |
| `git diff --check` | Passed. Git printed line-ending normalization warnings for existing and edited files. |
| Current frontend server | `http://127.0.0.1:5173/` returned HTTP 200; its process command points to this checkout's `frontend/node_modules/.bin/vite`. |
| Current backend health | `GET http://127.0.0.1:5000/api/v1/health` returned HTTP 200 with `{"database":"connected","status":"ok"}`. |

Vitest also printed React `act(...)` and React Router future-flag warnings; these did not fail tests. npm printed an install-script approval warning for esbuild; the production build and tests passed afterward. The automated route tests do not replace visual browser checks for every role or manual verification of external PostgreSQL/deployment environments.

## Run commands

Open a PowerShell terminal for the backend:

```powershell
Set-Location E:\Occupie\backend
if (-not (Test-Path .venv\Scripts\python.exe)) { python -m venv .venv }
\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
flask --app run db upgrade
python run.py
```

Open a second PowerShell terminal for the frontend:

```powershell
Set-Location E:\Occupie\frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open `http://localhost:5173`. The frontend proxies `/api` to Flask at `http://127.0.0.1:5000` by default. Back up the intended database before running migrations.

For verification, run `\.venv\Scripts\python.exe -m pytest -q` from `backend`, and `npm test -- --reporter=dot` plus `npm run build` from `frontend`.

