# SeatSync Specification - Occupie Implementation Gap Analysis

**Generated:** 2026-10-10  
**Audit Status:** Phase 1 Complete - Baseline Established

## Executive Summary

Occupie has a **solid operational foundation** with working authentication, role-based access, table management, reservations, waitlist, and deterministic allocation. The application is production-capable for basic restaurant seating operations.

**Key Strengths:**
- Clean architecture with React 18 + Flask + PostgreSQL/SQLite
- 52/52 backend tests passing with comprehensive coverage
- All four role dashboards functional and navigable
- Secure authentication (JWT + Werkzeug scrypt, HTTP-only cookies, CSRF)
- Database-backed restaurant multi-tenancy
- Deterministic allocation with reservation conflict protection
- Frontend build successful (318.57 kB optimized bundle)

**Implementation Gaps vs. SeatSync Specification:**
The current system implements a **deterministic rule-based allocator** rather than the **adaptive scoring engine** described in SeatSync. The specification requires configurable weighted scoring with revenue optimization, wait-time prediction, and table utilization analysis—none of which are currently implemented.

---

## Phase-by-Phase Gap Assessment

### PHASE 2: Website Architecture ⚠️ Partially Complete

| Requirement | Status | Gap |
|-------------|--------|-----|
| Landing page | ✅ Complete | Cinematic landing with product story exists |
| Sign-in page | ✅ Complete | `/auth/login` functional |
| Registration page | ✅ Complete | `/auth/register` creates customer accounts |
| Forgot-password page | ⚠️ Present but incomplete | Page exists at `/auth/forgot-password` but no form implementation—returns dev link only |
| Reset-password page | ✅ Complete | `/auth/reset-password?token=...` functional |
| Email verification | ⚠️ Bypassed | Registration immediately sets `email_verified_at`; no verification email sent in normal flow |
| Four role dashboards | ✅ Complete | All accessible with correct role guards |
| Direct URL access | ✅ Complete | All routes support refresh and direct navigation |
| Authenticated redirects | ✅ Complete | `DashboardAccess` enforces role-based routing |

**Actions Required:**
- Implement forgot-password form UI (currently shows dev link only)
- Add resend-verification UI (backend endpoint exists, no frontend form)
- Fix registration flow to issue verification emails in production mode

---

### PHASE 3: Authentication & Authorization ✅ Largely Complete

| Requirement | Status | Implementation Details |
|-------------|--------|------------------------|
| Flask-JWT-Extended | ✅ Complete | Using HTTP-only access/refresh cookies |
| Werkzeug password hashing | ✅ Complete | Scrypt with 12-128 char validation |
| JWT issuance/validation | ✅ Complete | Short-lived tokens with rotation on refresh |
| Role resolution | ✅ Complete | Via `RestaurantMembership` or customer default |
| Route/endpoint protection | ✅ Complete | `@jwt_required()` + role decorators |
| CSRF protection | ✅ Complete | CSRF tokens in headers for mutations |
| Token expiry handling | ✅ Complete | Automatic refresh on 401 with retry |
| Logout | ✅ Complete | Revokes tokens, expires cookies |
| Duplicate registration | ✅ Complete | Returns 409 for existing email |
| Rate limiting | ✅ Complete | Applied to auth endpoints |

**No actions required.** Authorization is production-ready with proper separation of customer/host/floor_staff/manager permissions.

---

### PHASE 4: Restaurant Data Model ✅ Complete

| Entity | Status | Schema Details |
|--------|--------|----------------|
| Users with roles | ✅ Complete | Base role + `RestaurantMembership` for staff |
| Restaurant tables | ✅ Complete | ID, capacity, section, status, assigned_server, party_size, time_seated |
| Reservations | ✅ Complete | Customer, table, party size, times, status, preferences, notes |
| Waitlist entries | ✅ Complete | Party details, status, creation time, table assignment |
| Table events/audit | ✅ Complete | `AuditEvent` with restaurant, actor, entity, action, JSON details |
| Allocation logs | ❌ Missing | No separate allocation decision log table |

**Actions Required:**
- Add `AllocationDecision` model to store recommendation scores, reasons, alternatives, and outcomes for analytics

---

### PHASE 5: Customer Workflow ✅ Complete

| Capability | Status | Notes |
|------------|--------|-------|
| Create reservation | ✅ Complete | With availability check before confirmation |
| Check availability | ✅ Complete | `GET /api/v1/allocations/recommend` |
| View upcoming reservations | ✅ Complete | Customer-scoped query |
| View past reservations | ✅ Complete | Dining history page functional |
| Check booking status | ✅ Complete | Status badges in UI |
| Cancel reservation | ✅ Complete | Customer can cancel own confirmed bookings |
| Check in | ✅ Complete | Customer can check in to own reservations |
| Validation | ✅ Complete | Backend validates dates, party size, availability |
| Loading/error states | ✅ Complete | Proper UI feedback throughout |

**No actions required.** Customer workflow is fully functional.

---

### PHASE 6: Adaptive Seating Engine ❌ Major Gap

**Current Implementation:** Deterministic single-table rule  
**SeatSync Requirement:** Configurable weighted scoring with revenue optimization

#### Step A: Feasibility Filtering ⚠️ Partially Complete

| Constraint | Status | Implementation |
|------------|--------|----------------|
| Capacity validation | ✅ Complete | Rejects undersized tables |
| Availability check | ✅ Complete | Only `available` status eligible |
| Booking conflicts | ✅ Complete | 90-min reservation protection window |
| Restaurant policies | ❌ Not configurable | Hard-coded 90-min window, no policy engine |

**Gap:** No configurable policy framework. Policies are embedded in code constants.

#### Step B: Scoring Function ❌ Not Implemented

| Factor | Status | Current Behavior |
|--------|--------|------------------|
| Capacity fit scoring | ❌ Missing | Uses simple sort: smallest surplus capacity |
| Wait time estimation | ❌ Missing | No turnover prediction |
| Table idle time | ❌ Missing | Not tracked for scoring |
| Revenue opportunity | ❌ Missing | No revenue modeling |
| Configurable weights | ❌ Missing | No weight configuration system |
| Score normalization | ❌ Missing | N/A - no scoring |

**Current Logic:**
```python
# Sorts by: (1) section match, (2) smallest surplus, (3) table ID
candidates.sort(key=lambda table: (
    0 if preferred_section and table.section.casefold() == preferred_section.casefold() else 1,
    table.capacity - party_size,
    str(table.id),
))
return candidates[0] if candidates else None
```

**SeatSync Requirement:** Multi-factor weighted scoring system with:
- Capacity utilization score (minimize waste)
- Expected wait time impact (predict turnover)
- Table idle time cost (track underutilization)
- Revenue optimization (party spending potential)
- Configurable weight tuning per restaurant

#### Step C: Recommendation API ⚠️ Partially Complete

| Feature | Status | Gap |
|---------|--------|-----|
| Returns single recommendation | ✅ Complete | One table returned |
| Returns multiple candidates | ❌ Missing | Only returns one table or null |
| Provides scores | ❌ Missing | No scoring implemented |
| Explains reasoning | ⚠️ Partial | Returns strategy name only, no detailed explanation |
| Shows alternatives | ❌ Missing | No ranked candidate list |
| Revalidates on confirmation | ✅ Complete | Backend rechecks availability |

**Current Response:**
```json
{
  "available": true,
  "recommendation": { "id": "T01", "capacity": 4, ... },
  "strategy": "smallest_available"
}
```

**SeatSync Expected Response:**
```json
{
  "available": true,
  "primaryRecommendation": {
    "table": { "id": "T01", ... },
    "score": 0.87,
    "factors": {
      "capacityFit": 0.9,
      "waitImpact": 0.85,
      "revenueOpportunity": 0.88
    },
    "reason": "Optimal capacity match with minimal wait impact"
  },
  "alternatives": [
    { "table": {...}, "score": 0.72, "reason": "..." }
  ],
  "configuration": {
    "weights": { "capacity": 0.4, "wait": 0.3, "revenue": 0.3 }
  }
}
```

#### Step D: Concurrency Protection ⚠️ Partially Complete

| Protection | Status | Implementation |
|------------|--------|----------------|
| Database transactions | ✅ Complete | All mutations wrapped |
| Row locking | ⚠️ PostgreSQL only | `SELECT FOR UPDATE` used, but SQLite ignores it |
| Conflict prevention tests | ⚠️ Partial | Tests exist but SQLite doesn't prove production behavior |
| Exclusion constraints | ❌ Not used | Could add PostgreSQL EXCLUDE constraints for overlapping reservations |

**Gap:** SQLite development doesn't validate concurrency protection. Tests should require PostgreSQL test database.

---

### PHASE 7: Waitlist & No-Show Recovery ⚠️ Partially Complete

| Feature | Status | Gap |
|---------|--------|-----|
| Walk-in registration | ✅ Complete | Host can add parties |
| Waitlist viewing | ✅ Complete | Queue ordered by creation time |
| Wait time estimation | ❌ Not implemented | Returns `quotedWait: null` always |
| Table matching | ✅ Complete | Oldest seatablequeue party prioritized |
| Check-in guests | ✅ Complete | Update reservation status |
| No-show recording | ⚠️ Manual only | Status exists, no automatic grace period |
| Grace period (15min) | ❌ Not configured | No grace period timer or policy |
| Audit history | ✅ Complete | `AuditEvent` records all actions |
| Manager override | ⚠️ No explicit override UI | Manager can change any status but no "override" flag |
| Table release validation | ✅ Complete | Checks before releasing reservation hold |

**Actions Required:**
- Implement wait time prediction algorithm based on occupied table history
- Add configurable grace period policy (default 15 minutes)
- Create automated no-show detection job (background task)
- Add manager override flag in `AuditEvent` details
- Build grace period countdown UI for host dashboard

---

### PHASE 8: Role Dashboards ✅ Largely Complete

#### Manager Dashboard ⚠️ Partially Complete

| Feature | Status | Gap |
|---------|--------|-----|
| Operational overview | ✅ Complete | Tables, reservations, waitlist displayed |
| Table configuration | ✅ Complete | Create/update tables with section |
| Reservation overview | ✅ Complete | All bookings visible |
| Table utilization metrics | ⚠️ Demo data | Shows placeholder KPIs, not real calculations |
| Booking metrics | ⚠️ Demo data | Some cards labeled "demo data" |
| Shift reporting | ⚠️ Client-side only | CSV generated from loaded records, no backend API |
| No-show overrides | ⚠️ No explicit override | Can change status, no override tracking |

**Actions Required:**
- Implement backend analytics API for historical metrics
- Replace demo KPI data with real event-based calculations
- Add shift report backend API with date range queries
- Add manager override flag for policy exceptions

#### Host Dashboard ✅ Complete

All features functional: reservations, waitlist, walk-in queue, seating recommendations, check-in workflows.

#### Floor Staff Dashboard ✅ Complete

All features functional: table status updates, assigned table filtering, service state transitions.

#### Customer Dashboard ✅ Complete

All features functional: booking, upcoming reservations, history, check-in, cancellation.

---

### PHASE 9: Analytics & Evaluation ❌ Major Gap

| Metric | Status | Implementation Needed |
|--------|--------|----------------------|
| Average wait time | ❌ Missing | Calculate: waitlist seated_time - created_at |
| Table idle time | ❌ Missing | Track: time between `available` transitions |
| Seat utilization | ❌ Missing | Formula: occupied_seat_minutes / available_seat_minutes |
| Recovered bookings | ❌ Missing | Count: waitlist entries successfully seated |
| Booking conflicts | ❌ Missing | Track: rejected allocation attempts due to conflicts |
| Revenue opportunity | ❌ Missing | Requires revenue model (not in current schema) |
| Baseline comparison | ❌ Missing | Need first-feasible allocator for A/B testing |
| Recharts visualization | ⚠️ Placeholder | Charts exist but show demo data |

**Current State:** Manager dashboard shows placeholder metrics labeled as demo data. No backend analytics API exists.

**Actions Required:**
1. Create `backend/app/services/analytics.py` for metric calculations
2. Add analytics routes: `/api/v1/analytics/wait-times`, `/utilization`, `/bookings`
3. Store table state transition events for idle time calculation
4. Implement baseline "first-available" allocator for comparison
5. Create time-series data aggregation for dashboard charts
6. Add revenue tracking fields if revenue optimization is required

---

### PHASE 10: Testing ⚠️ Good Coverage, Missing Load Tests

| Test Category | Status | Coverage |
|---------------|--------|----------|
| Registration & login | ✅ Complete | 11 auth tests |
| Role authorization | ✅ Complete | Covers customer/host/floor_staff/manager |
| Reservation validation | ✅ Complete | Includes overlap detection |
| Table capacity | ✅ Complete | Validates party size constraints |
| Overlapping bookings | ✅ Complete | Tests 90-min protection window |
| Allocation feasibility | ✅ Complete | Tests smallest-suitable logic |
| Waitlist operations | ✅ Complete | Queue priority, seating |
| Grace period policies | ❌ Not tested | No grace period implemented yet |
| Manager overrides | ❌ Not tested | No override tracking implemented |
| Table state transitions | ✅ Complete | Tests status validation |
| Analytics calculations | ❌ Not tested | No analytics implemented yet |
| **Total backend tests** | **52/52 passing** | Comprehensive for current features |

**Load Testing:** ❌ Not implemented
- No Locust test scenarios exist
- Need 10/50/100 concurrent user simulations
- Must measure latency, throughput, error rates, booking contention

**Actions Required:**
1. Create `backend/tests/locustfile.py` with realistic user flows
2. Add grace period policy tests when implemented
3. Add analytics calculation tests when implemented
4. Create PostgreSQL-specific concurrency tests (separate from SQLite suite)

---

### PHASE 11: Design Preservation ✅ Complete

| Element | Status | Implementation |
|---------|--------|----------------|
| Cream/ivory surfaces | ✅ Complete | Consistent throughout dashboards |
| Burgundy/dark brown sections | ✅ Complete | Sidebar, headers, accents |
| Gold accents | ✅ Complete | Premium highlights |
| Typography | ✅ Complete | Restaurant-grade font hierarchy |
| Cinematic landing | ✅ Complete | Frame animation with brand lockup |
| Responsive layouts | ✅ Complete | Mobile sidebar, adaptive grids |
| Accessible controls | ✅ Complete | Semantic HTML, focus states |

**No actions required.** Visual identity is well-preserved.

---

## Critical Implementation Priorities

### Priority 1: Core SeatSync Differentiators (Required for Spec Compliance)

1. **Adaptive Scoring Engine** (PHASE 6B)
   - Implement weighted multi-factor scoring system
   - Add configurable weight tuning (capacity, wait, utilization, revenue)
   - Create score normalization and explainability
   - **Estimated effort:** 3-4 days

2. **Enhanced Allocation API** (PHASE 6C)
   - Return multiple ranked candidates with scores
   - Provide detailed reasoning for each recommendation
   - Show configuration/weights used
   - **Estimated effort:** 2 days

3. **Analytics Backend** (PHASE 9)
   - Implement real metric calculations (wait time, idle time, utilization)
   - Create time-series aggregation API
   - Build baseline allocator for comparison
   - **Estimated effort:** 3-4 days

### Priority 2: Operational Completeness

4. **Grace Period & Auto No-Show** (PHASE 7)
   - Implement configurable grace period (15 min default)
   - Create background job for late-arrival detection
   - Add countdown UI in host dashboard
   - **Estimated effort:** 2 days

5. **Wait Time Prediction** (PHASE 7)
   - Analyze occupied table history for turnover rates
   - Provide estimated wait ranges for waitlist
   - **Estimated effort:** 2-3 days

6. **Manager Override Tracking** (PHASE 7-8)
   - Add override flag to AuditEvent
   - Build manager override UI for policy exceptions
   - **Estimated effort:** 1 day

### Priority 3: Testing & Validation

7. **Load Testing** (PHASE 10)
   - Create Locust scenarios for 10/50/100 concurrent users
   - Measure and document performance characteristics
   - **Estimated effort:** 1-2 days

8. **PostgreSQL Concurrency Tests** (PHASE 6D)
   - Create separate PostgreSQL test suite
   - Validate row locking and conflict prevention
   - **Estimated effort:** 1 day

### Priority 4: User Experience Refinements

9. **Forgot Password Form** (PHASE 2)
   - Implement UI for password reset request
   - **Estimated effort:** 0.5 day

10. **Email Verification Flow** (PHASE 2)
    - Re-enable verification emails in registration
    - Add resend-verification UI
    - **Estimated effort:** 1 day

---

## Data Model Extensions Required

### New Tables Needed

```sql
-- For allocation decision tracking and analytics
CREATE TABLE allocation_decisions (
    id SERIAL PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    party_size INTEGER NOT NULL,
    preferred_section VARCHAR(80),
    primary_recommendation_id VARCHAR(32) REFERENCES restaurant_tables(id),
    primary_score DECIMAL(5,4),
    score_factors JSONB, -- {capacityFit: 0.9, waitImpact: 0.85, ...}
    alternatives JSONB, -- [{ tableId, score, reason }, ...]
    weights_used JSONB, -- {capacity: 0.4, wait: 0.3, revenue: 0.3}
    accepted BOOLEAN,
    accepted_table_id VARCHAR(32) REFERENCES restaurant_tables(id),
    rejection_reason VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- For table state history and idle time calculation
CREATE TABLE table_state_events (
    id SERIAL PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id),
    table_id VARCHAR(32) NOT NULL REFERENCES restaurant_tables(id),
    previous_status VARCHAR(16),
    new_status VARCHAR(16) NOT NULL,
    previous_party_size INTEGER,
    new_party_size INTEGER,
    actor_user_id INTEGER REFERENCES users(id),
    transition_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    INDEX idx_table_transitions (table_id, transition_at)
);

-- Optional: for revenue tracking if needed
CREATE TABLE party_spending (
    id SERIAL PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id),
    reservation_id VARCHAR(40) REFERENCES reservations(id),
    table_id VARCHAR(32) REFERENCES restaurant_tables(id),
    party_size INTEGER NOT NULL,
    total_amount DECIMAL(10,2),
    seated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## Configuration System Required

Create `backend/app/config/restaurant_policies.py`:

```python
class AllocationConfig:
    """Configurable weights for adaptive scoring."""
    capacity_fit_weight: float = 0.40
    wait_time_weight: float = 0.30
    idle_time_weight: float = 0.15
    revenue_weight: float = 0.15
    
    reservation_hold_minutes: int = 90
    grace_period_minutes: int = 15
    
    # Normalization bounds for scoring
    max_capacity_waste: int = 4  # seats
    max_wait_impact: int = 60  # minutes
    max_idle_penalty: int = 120  # minutes
```

Store per-restaurant in database or configuration files.

---

## Baseline Allocator for Comparison

Implement "first-feasible" allocator in `backend/app/services/baseline_allocation.py`:

```python
def first_feasible_table(tables, party_size, reservations, at=None):
    """Simplest possible allocation: first available table that fits.
    
    Used for A/B comparison against adaptive scoring engine.
    """
    for table in sorted(tables, key=lambda t: t.id):
        if (table.status == 'available' 
            and table.capacity >= party_size
            and not has_reservation_conflict(table, reservations, at)):
            return table
    return None
```

Run identical scenarios through both allocators and compare:
- Average wait time
- Table utilization
- Guest satisfaction (requires feedback mechanism)
- Revenue (if tracked)

---

## Summary: What Works vs. What's Missing

### ✅ What Works (Production-Ready)

- Complete authentication & authorization system
- All four role dashboards with proper navigation
- Customer booking workflow end-to-end
- Host seating operations (reservations + waitlist)
- Floor staff table status management
- Manager table configuration
- Deterministic allocation with conflict protection
- Database multi-tenancy
- Audit logging
- 52/52 tests passing
- Clean, maintainable codebase

### ❌ What's Missing (SeatSync Specification Gaps)

**Showstoppers for SeatSync compliance:**
1. **No adaptive scoring engine** - uses simple deterministic rule instead
2. **No multi-candidate recommendations** - returns single table only
3. **No configurable weights** - policies hard-coded
4. **No analytics API** - dashboard shows placeholder data
5. **No baseline comparison** - can't prove optimization works
6. **No load testing** - performance unverified at scale

**Operational gaps:**
7. No wait time prediction
8. No grace period / auto no-show detection
9. No manager override tracking
10. No revenue optimization (no revenue model in schema)

**User experience gaps:**
11. Email verification bypassed in registration
12. Forgot password form not implemented
13. No live push notifications (uses polling)

---

## Recommended Implementation Sequence

**Week 1: Core Algorithm (Priority 1)**
- Day 1-2: Implement weighted scoring engine
- Day 3-4: Enhance allocation API with multiple candidates
- Day 5: Add allocation decision logging

**Week 2: Analytics Foundation (Priority 1 + 2)**
- Day 1-2: Build analytics service and API
- Day 3: Implement baseline allocator
- Day 4-5: Add wait time prediction and grace period

**Week 3: Testing & Refinement (Priority 3 + 4)**
- Day 1-2: Create load tests and run benchmarks
- Day 3: Fix forgot-password and verification flows
- Day 4-5: Manager override UI and final polish

**Total estimated effort:** 3 weeks for full SeatSync compliance

---

## Acceptance Criteria Checklist

- [ ] Weighted adaptive scoring with configurable factors
- [ ] Multi-candidate recommendations with scores and reasoning
- [ ] Real-time analytics API (wait time, utilization, idle time)
- [ ] Baseline allocator comparison proving optimization
- [ ] Grace period policy with auto no-show detection
- [ ] Wait time prediction for waitlist
- [ ] Manager override tracking in audit log
- [ ] Load tests passing at 10/50/100 concurrent users
- [ ] All operational workflows tested end-to-end
- [ ] Email verification functional in production mode
- [ ] Forgot password form implemented
- [ ] Documentation updated with new APIs and configuration

---

**End of Gap Analysis**
