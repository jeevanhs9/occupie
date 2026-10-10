# Occupie — Team Workflow & Development Guidelines

## Folder Ownership

| Team Member | Owned Area | Branch |
|---|---|---|
| **Member 1 — Frontend Developer** | `frontend/` | `feature/frontend-base` |
| **Member 2 — Backend Developer** | `backend/` | `feature/backend-base` |
| **Member 3 — Integration / QA / Docs** | `docs/`, project-wide integration, git workflow | `feature/integration-docs` |

**Rule:** Never modify another member's owned folder without prior coordination and a PR discussion.

---

## Branch Strategy

```
main (stable, protected)
  └── develop (integration target)
        ├── feature/frontend-base     (Member 1)
        ├── feature/backend-base      (Member 2)
        └── feature/integration-docs  (Member 3)
```

- **`main`** — Only accepts production-ready merges after integration review.
- **`develop`** — Day-to-day integration branch. All feature PRs merge here first.
- **Feature branches** — One per significant work stream. Keep them short-lived.

---

## Git Workflow

### Starting Work
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Daily Commit Convention
Use conventional commits for clean history:

```bash
git add .
git commit -m "feat(frontend): add Host dashboard reservation list component"
git commit -m "fix(backend): resolve CORS preflight headers on /api/v1/health"
git commit -m "docs: add API_CONTRACT endpoint stubs for Phase 2"
```

Prefix options: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

### Pushing and Opening a PR
```bash
git push origin feature/your-feature-name
# Open a Pull Request targeting develop (not main)
```

### Merging Into Develop
- PRs require at least 1 review before merging.
- Member 3 (Integration/QA) validates before merging into `develop`.
- Squash merge for clean single-commit history.

---

## Current Demo Acceptance Criteria

Use this checklist for local demo readiness. Authentication, role authorization, and production migrations are tracked separately as planned work.

- [x] Frontend production build succeeds and the public/demo/dashboard paths serve the SPA.
- [x] Login and role selector are labeled demo flows; all four dashboard routes render in route tests.
- [x] Manager can add tables and export a CSV shift report.
- [x] Host can register walk-ins, seat the next serviceable party, and update reservation status.
- [x] Customer can request reservations, check in, or cancel in API mode.
- [x] Floor staff can update table availability in API mode.
- [x] Flask health, tables, reservations, waitlist, and allocation endpoints are tested.
- [x] Frontend and backend test suites pass in the project environments.
- [ ] Visual testing at desktop and mobile breakpoints remains to be completed.
- [ ] Authentication, server-side role authorization, analytics, push updates, and production migrations remain planned.

---

## Integration Responsibilities (Member 3)

1. Maintain `docs/API_CONTRACT.md` — keep frontend API calls and Flask response shapes aligned.
2. Review PRs for cross-boundary concerns (naming conventions, shared constants).
3. Coordinate `develop` → `main` merge timing.
4. Own the acceptance test checklist above.
5. Track migration, authentication/authorization, analytics, and realtime work as separate follow-up milestones.
