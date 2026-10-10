# Occupie Documentation Index

Complete guide to all documentation available for the Occupie restaurant management system.

## 📖 Quick Navigation

### For Judges & Evaluators
Start here for demo and presentation:
1. **[DEMO_RESOURCES.md](DEMO_RESOURCES.md)** — Master demo guide
2. **[PRE_DEMO_CHECKLIST.md](docs/PRE_DEMO_CHECKLIST.md)** — Setup verification
3. **[DEMO_QUICK_REFERENCE.md](docs/DEMO_QUICK_REFERENCE.md)** — Printable credentials

### For Developers
Start here for technical understanding:
1. **[README.md](README.md)** — Project overview & quick start
2. **[ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md)** — System design
3. **[API_REFERENCE.md](docs/API_REFERENCE.md)** — Endpoint documentation

### For Project Managers
Start here for comprehensive overview:
1. **[OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md)** — Full report
2. **[IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md)** — Feature status
3. **[SEATSYNC_ACCEPTANCE_REPORT.md](docs/SEATSYNC_ACCEPTANCE_REPORT.md)** — Acceptance report

---

## 📂 Documentation Categories

### 1. Getting Started

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](README.md) | Project overview, quick start, setup | Everyone |
| [SETUP.md](docs/SETUP.md) | Detailed setup instructions, production config | Developers, DevOps |
| [TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) | Git workflow, development practices | Developers |

### 2. Demo & Presentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[DEMO_RESOURCES.md](DEMO_RESOURCES.md)** | 🌟 Master demo guide with all materials | Presenters |
| **[PRE_DEMO_CHECKLIST.md](docs/PRE_DEMO_CHECKLIST.md)** | ✅ Pre-demo verification checklist | Presenters |
| **[DEMO_QUICK_REFERENCE.md](docs/DEMO_QUICK_REFERENCE.md)** | 🖨️ Printable credentials & 5-min script | Presenters |
| **[DEMO_AND_PRESENTATION_GUIDE.md](docs/DEMO_AND_PRESENTATION_GUIDE.md)** | 📖 Detailed scenarios & Q&A prep | Presenters |
| **[DEMO_DATA_REFERENCE.md](docs/DEMO_DATA_REFERENCE.md)** | 📊 Complete demo data details | Presenters |
| **[DEMO_FLOW_VISUAL.md](docs/DEMO_FLOW_VISUAL.md)** | 🎨 Visual flow diagrams | Presenters |

### 3. Technical Architecture

| Document | Purpose | Audience |
|----------|---------|----------|
| [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) | System architecture, ERD, state diagrams | Architects, Developers |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Core architecture decisions | Architects, Developers |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Complete API endpoint documentation | Developers, Integrators |
| [API_CONTRACT.md](docs/API_CONTRACT.md) | API contract specifications | Developers |

### 4. Project Reports

| Document | Purpose | Audience |
|----------|---------|----------|
| [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) | Comprehensive project report (Chapters 1-6) | Everyone |
| [SEATSYNC_ACCEPTANCE_REPORT.md](docs/SEATSYNC_ACCEPTANCE_REPORT.md) | Project acceptance and evaluation | Stakeholders, Judges |
| [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md) | Feature implementation status | Project Managers |
| [SEATSYNC_IMPLEMENTATION_GAP_ANALYSIS.md](docs/SEATSYNC_IMPLEMENTATION_GAP_ANALYSIS.md) | Gap analysis | Project Managers |

### 5. Navigation & Routes

| Document | Purpose | Audience |
|----------|---------|----------|
| [NAVIGATION_STATUS.md](docs/NAVIGATION_STATUS.md) | Navigation implementation status | Developers, Testers |
| [ROUTE_DIRECTORY.md](docs/ROUTE_DIRECTORY.md) | Frontend routing structure | Developers |
| [workflows.md](docs/workflows.md) | User workflows and journeys | UX, Product |
| [sitemap.md](docs/sitemap.md) | Application sitemap | UX, Product |

### 6. Miscellaneous

| Document | Purpose | Audience |
|----------|---------|----------|
| [audit-report.md](docs/audit-report.md) | Audit findings | Stakeholders |
| [api-contract.md](docs/api-contract.md) | Legacy API contract | Developers |

---

## 🎯 Usage Scenarios

### Scenario 1: "I need to demo this in 1 hour"

**Documents to read:**
1. [PRE_DEMO_CHECKLIST.md](docs/PRE_DEMO_CHECKLIST.md) (10 min)
2. [DEMO_QUICK_REFERENCE.md](docs/DEMO_QUICK_REFERENCE.md) (5 min — print this)
3. [DEMO_RESOURCES.md](DEMO_RESOURCES.md) (20 min — skim key sections)

**Actions:**
```powershell
cd backend
python seed_demo_data.py
python run.py
# New terminal
cd frontend
npm run dev
```

**Practice:** Login as each role, run through 5-minute flow

---

### Scenario 2: "I need to understand the architecture"

**Documents to read:**
1. [README.md](README.md) (5 min — overview)
2. [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) (30 min)
3. [API_REFERENCE.md](docs/API_REFERENCE.md) (20 min)
4. [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) Chapter 4-5 (30 min)

**Code to review:**
- `backend/app/services/adaptive_allocation.py` (allocation algorithm)
- `backend/app/models/` (database models)
- `frontend/src/contexts/AuthContext.jsx` (auth flow)

---

### Scenario 3: "I need to set up for development"

**Documents to read:**
1. [README.md](README.md) (5 min — quick start)
2. [SETUP.md](docs/SETUP.md) (15 min — detailed setup)
3. [TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) (10 min — Git workflow)

**Actions:**
```powershell
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask db upgrade
python run.py

# Frontend
cd frontend
npm install
npm run dev

# Verify
.\venv\Scripts\python.exe -m pytest -v  # 77 tests
npm run build  # 316 KB
```

---

### Scenario 4: "I need to evaluate this project"

**Documents to read:**
1. [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) (1-2 hours — comprehensive)
2. [SEATSYNC_ACCEPTANCE_REPORT.md](docs/SEATSYNC_ACCEPTANCE_REPORT.md) (30 min)
3. [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) (30 min)
4. [API_REFERENCE.md](docs/API_REFERENCE.md) (20 min)
5. [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md) (10 min)

**Tests to run:**
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
# Expected: 77 passed

cd ../frontend
npm run build
# Expected: 316.25 kB optimized
```

---

### Scenario 5: "I need to integrate with the API"

**Documents to read:**
1. [API_REFERENCE.md](docs/API_REFERENCE.md) (30 min — complete reference)
2. [API_CONTRACT.md](docs/API_CONTRACT.md) (15 min — specifications)
3. [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) Section 2-3 (15 min — auth flows)

**Test endpoint:**
```bash
# Health check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 📊 Documentation Statistics

| Category | Documents | Total Pages (est.) |
|----------|-----------|-------------------|
| Demo & Presentation | 6 | ~80 pages |
| Technical Architecture | 4 | ~60 pages |
| Project Reports | 4 | ~100 pages |
| Getting Started | 3 | ~20 pages |
| Navigation & Routes | 4 | ~30 pages |
| **TOTAL** | **21 documents** | **~290 pages** |

---

## 🔍 Search Guide

### Looking for information about...

**Authentication:**
- [API_REFERENCE.md](docs/API_REFERENCE.md) — Auth endpoints
- [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) — Auth sequences
- [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) Chapter 6

**Table Allocation:**
- [DEMO_DATA_REFERENCE.md](docs/DEMO_DATA_REFERENCE.md) — Algorithm details
- [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) Chapter 5
- Code: `backend/app/services/adaptive_allocation.py`

**Database Schema:**
- [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) Section 6 (ERD)
- Code: `backend/app/models/*.py`
- Migrations: `backend/migrations/versions/*.py`

**User Roles & Permissions:**
- [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) Section 7 (permissions matrix)
- [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) Chapter 6
- [DEMO_RESOURCES.md](DEMO_RESOURCES.md) — Role-based scenarios

**Testing:**
- [OCCUPIE_COMPLETE_PROJECT_REPORT.md](docs/OCCUPIE_COMPLETE_PROJECT_REPORT.md) Chapter 5.8
- Code: `backend/tests/*.py` (77 tests)
- README.md — Quick test commands

**Deployment:**
- [SETUP.md](docs/SETUP.md) — Production configuration
- [ARCHITECTURE_AND_DATA_FLOW.md](docs/ARCHITECTURE_AND_DATA_FLOW.md) Section 9
- README.md — Quick start

**Demo Scenarios:**
- [DEMO_RESOURCES.md](DEMO_RESOURCES.md) — All scenarios
- [DEMO_FLOW_VISUAL.md](docs/DEMO_FLOW_VISUAL.md) — Visual guides
- [DEMO_DATA_REFERENCE.md](docs/DEMO_DATA_REFERENCE.md) — Data details

---

## 📝 Contributing to Documentation

### Adding New Documentation

1. Create file in appropriate location:
   - Demo materials → `docs/`
   - Root-level guides → project root
   - Technical specs → `docs/`

2. Update this index:
   - Add to relevant category table
   - Add to search guide if applicable
   - Update statistics

3. Link from related documents:
   - Update README.md if top-level doc
   - Cross-reference from related docs

### Documentation Standards

- **Markdown format:** All docs in `.md` format
- **Clear headings:** Use H1 for title, H2 for sections
- **Code blocks:** Use syntax highlighting
- **Examples:** Include practical examples
- **Links:** Use relative links within project
- **TOC:** Add table of contents for long docs (>10 sections)

---

## 🎓 Learning Path

### Path 1: User → Presenter (4 hours)
1. README.md → Understand what Occupie does
2. DEMO_RESOURCES.md → Learn demo materials
3. DEMO_QUICK_REFERENCE.md → Memorize key info
4. Practice demo → Hands-on with seed data

### Path 2: User → Developer (8 hours)
1. README.md → Project overview
2. SETUP.md → Environment setup
3. ARCHITECTURE_AND_DATA_FLOW.md → System design
4. API_REFERENCE.md → API endpoints
5. Read source code → Backend & frontend
6. Run tests → Understand coverage
7. TEAM_WORKFLOW.md → Development practices

### Path 3: User → Architect (6 hours)
1. README.md → High-level overview
2. OCCUPIE_COMPLETE_PROJECT_REPORT.md → Comprehensive understanding
3. ARCHITECTURE_AND_DATA_FLOW.md → Deep technical dive
4. Review key source files:
   - `adaptive_allocation.py`
   - Database models
   - Auth middleware
5. API_REFERENCE.md → Integration points

---

## 🆘 Help & Support

### Common Questions

**Q: Where do I start?**  
A: [README.md](README.md) for overview, then follow a learning path above

**Q: How do I demo this?**  
A: [DEMO_RESOURCES.md](DEMO_RESOURCES.md) has everything you need

**Q: How do I set up for development?**  
A: [SETUP.md](docs/SETUP.md) has detailed instructions

**Q: Where are the API docs?**  
A: [API_REFERENCE.md](docs/API_REFERENCE.md) has complete endpoint documentation

**Q: What features are implemented?**  
A: [IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md) has status

**Q: How does the allocation algorithm work?**  
A: [DEMO_DATA_REFERENCE.md](docs/DEMO_DATA_REFERENCE.md) has detailed explanation + code at `backend/app/services/adaptive_allocation.py`

---

## 📅 Last Updated

**Date:** October 10, 2026  
**Version:** 1.0  
**Total Documentation:** 21 documents, ~290 pages  
**Maintained by:** Occupie Development Team

---

**For the most up-to-date documentation, always check the GitHub repository.**
