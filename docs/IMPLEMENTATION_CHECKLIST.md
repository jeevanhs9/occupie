# Occupie implementation checklist

> **Historical verification record:** the test counts and completion marks below record an earlier implementation pass. They were not re-run as part of the documentation audit dated 2026-10-11. Use [audit-report.md](audit-report.md) for current code status and verification performed in this phase.

This checklist records the audited state and the implementation verified in this pass. It distinguishes local test coverage from deployment/browser checks that require external services.

## Existing project and protected areas

- [x] Kept the existing React 18 + Vite + React Router frontend and Flask + SQLAlchemy + Flask-Migrate backend.
- [x] Preserved the existing landing-page, auth, and manager/host/floor-staff/customer route structure.
- [x] Left restaurant media and extracted frames in place; the landing scene continues to use the current cinematic component and assets.
- [x] No authentication, dashboard, API, database-model, or reservation files outside the requested feature work were reset or discarded.

## Implemented and locally verified

- [x] Shared reduced-motion-aware page entrance for login, auth actions, role selection, and all four dashboards.
- [x] Subtle reusable entrances for dashboard cards and KPI cards; content remains immediately available.
- [x] Floor staff may read reservations and update table state, but cannot create or change reservation state through the API.
- [x] Floor-staff dashboard uses the authenticated account in API mode and identifies demo-only data as a preview.
- [x] Reservation payloads include the associated restaurant name; customer cards avoid substituting a hardcoded restaurant in API mode.
- [x] Customer registration, verification, login, recommendation, booking, host seating, floor table-state update, and manager visibility exercised together using the Flask test client and isolated test database.
- [x] Flask-CORS uses the configured exact-origin allowlist, credentials, and the headers/methods used by the current API.
- [x] Authentication pages define the antique-gold token required by their shared primary action, keeping the sign-in button legible on the dark form surface.
- [x] Editorial floor-plan sections collapse to a single readable section column on narrow screens.
- [x] Frontend tests: 16 passed. Frontend production build: passed.
- [x] Backend tests: 48 passed after the Flask-CORS extension change, including origin allowlist/preflight checks and the integrated customer-to-staff workflow.
- [x] Migration metadata reports the local development database at `e880f4e1dce4`, the current migration head.

## Deployment and browser checks still requiring environment support

- [ ] PostgreSQL deployment verification: no PostgreSQL service/URL is configured in this workspace. Local automated workflow tests use SQLite; production startup is configured to reject SQLite.
- [ ] Real verification/reset email delivery: SMTP credentials are not configured. In development, tokens are exposed through the test hook/log path rather than falsely reporting delivery.
- [ ] Shared production rate limiting: Redis is required by production configuration but is not configured locally; local development uses the documented in-memory limiter.
- [ ] Full desktop browser verification and visual review of every authenticated route: the in-app browser was available at a 300×600 viewport only, and a running backend/authenticated test account is needed to inspect all dashboard states. Automated component/API tests are not a substitute for this visual check.
- [ ] Production HTTPS cookie behavior and cross-origin deployment: requires the final deployed origin, TLS, PostgreSQL, Redis, and SMTP settings.

## Required deployment configuration

Set `DATABASE_URL` to PostgreSQL, distinct random `SECRET_KEY` and `JWT_SECRET_KEY` values of at least 32 characters, `COOKIE_SECURE=true`, a Redis `RATELIMIT_STORAGE_URI`, the deployed frontend in `FRONTEND_ORIGINS` and `FRONTEND_PUBLIC_URL`, and verified SMTP settings (`MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_USE_TLS`, `MAIL_FROM`). Apply reviewed Flask-Migrate revisions before starting production traffic.
