# Demo Data Reference

Quick reference for all demo data created by `seed_demo_data.py`

## Restaurant Configuration

**Name:** The Golden Fork  
**Total Tables:** 12  
**Total Capacity:** 60 seats  
**Operating Hours:** 11:00 AM - 10:00 PM  
**Reservation Window:** 90 minutes

---

## Table Configuration

| Table | Capacity | Location | Status | Notes |
|-------|----------|----------|--------|-------|
| T1 | 2 | Window | Available | Premium window seat |
| T2 | 2 | Window | Available | Premium window seat |
| T3 | 4 | Main Floor | Available | **Use for demo** (Christopher Moore) |
| T4 | 4 | Main Floor | Occupied | **Use for demo** (floor staff clearing) |
| T5 | 4 | Patio | Available | Outdoor seating |
| T6 | 6 | Main Floor | Reserved | Sarah Johnson's 7:00 PM |
| T7 | 6 | Private | Available | Private dining area |
| T8 | 8 | Main Floor | Available | Large party table |
| T9 | 2 | Bar Area | Available | Quick seating option |
| T10 | 4 | Bar Area | Available | Casual dining |
| T11 | 6 | Patio | Maintenance | Out of service |
| T12 | 8 | Private | Available | Large private events |

**Capacity Summary:**
- 2-seaters: 3 tables (T1, T2, T9)
- 4-seaters: 4 tables (T3, T4, T5, T10)
- 6-seaters: 3 tables (T6, T7, T11)
- 8-seaters: 2 tables (T8, T12)

---

## User Accounts

### Staff Accounts

| Name | Email | Password | Role | Restaurant |
|------|-------|----------|------|------------|
| Demo Manager | manager@goldenfork.com | Manager123! | Manager | The Golden Fork |
| Demo Host | host@goldenfork.com | Host123! | Host | The Golden Fork |
| Demo Floor Staff | staff@goldenfork.com | Staff123! | Floor Staff | The Golden Fork |

**Permissions:**
- **Manager:** Full access (view all, modify all, configure restaurant)
- **Host:** Seating operations (waitlist, reservations, table allocation)
- **Floor Staff:** Table status updates (mark available, occupied, maintenance)

### Customer Accounts

| Name | Email | Password | Active Reservations |
|------|-------|----------|---------------------|
| Sarah Johnson | sarah.johnson@email.com | Customer123! | ✅ Today 7:00 PM |
| Michael Chen | michael.chen@email.com | Customer123! | ❌ None |
| Emily Rodriguez | emily.rodriguez@email.com | Customer123! | ✅ Tomorrow 6:30 PM |
| David Martinez | david.martinez@email.com | Customer123! | ✅ Today 12:00 PM (completed) |
| Lisa Wang | lisa.wang@email.com | Customer123! | ✅ Today 1:30 PM (completed) |
| James Brown | james.brown@email.com | Customer123! | ✅ Today 6:00 PM (completed) |
| Robert Taylor | robert.taylor@email.com | Customer123! | ⏳ Today 7:30 PM (pending) |
| Jennifer Lee | jennifer.lee@email.com | Customer123! | ✅ Today 8:00 PM |
| William Davis | william.davis@email.com | Customer123! | ✅ Today 8:30 PM |

---

## Reservation Schedule

### Today's Reservations

| Time | Customer | Party Size | Table | Status | Demo Use |
|------|----------|------------|-------|--------|----------|
| 12:00 PM | David Martinez | 4 | T3 | Completed | Historical data |
| 1:30 PM | Lisa Wang | 2 | T1 | Completed | Historical data |
| 6:00 PM | James Brown | 6 | T7 | Completed | Historical data |
| **7:00 PM** | **Sarah Johnson** | **4** | **T6** | **Confirmed** | **Customer demo login** |
| 7:30 PM | Robert Taylor | 2 | — | Pending | Show pending allocation |
| 8:00 PM | Jennifer Lee | 4 | T5 | Confirmed | Active reservation |
| 8:30 PM | William Davis | 8 | T12 | Confirmed | Large party example |

### Future Reservations

| Date | Time | Customer | Party Size | Status |
|------|------|----------|------------|--------|
| Tomorrow | 6:30 PM | Emily Rodriguez | 2 | Confirmed |

---

## Waitlist Queue

### Current Waitlist (Ready for Demo)

| Position | Name | Phone | Party Size | Estimated Wait | Status | Demo Use |
|----------|------|-------|------------|----------------|--------|----------|
| 1 | Amanda Wilson | (555) 123-4567 | 2 | 15 min | Waiting | Available for demo |
| 2 | **Christopher Moore** | **(555) 234-5678** | **4** | **25 min** | **Waiting** | **⭐ PRIMARY DEMO** |
| 3 | Patricia Garcia | (555) 345-6789 | 6 | 35 min | Waiting | Available for demo |

**Demo Recommendation:**
- Use **Christopher Moore** (Party of 4) for primary seating demo
- Expected allocation recommendations:
  - T3: Score 95 (perfect capacity match, main floor)
  - T5: Score 85 (patio, capacity match)
  - T10: Score 75 (bar area, capacity match)

---

## Demo Scenarios by Role

### Scenario 1: Customer (sarah.johnson@email.com)
**Login:** sarah.johnson@email.com / Customer123!

**What to Show:**
1. Navigate to "My Reservations"
2. Show active reservation: Tonight 7:00 PM, Party of 4
3. Highlight features:
   - Reservation status (Confirmed)
   - Table assignment (T6)
   - Special requests field
   - Cancel option
   - Reservation history

**Key Message:** "Customers have full control and visibility into their bookings"

---

### Scenario 2: Host (host@goldenfork.com)
**Login:** host@goldenfork.com / Host123!

**What to Show:**
1. **Dashboard Overview**
   - 9 available tables
   - 3 waitlist entries
   - 5 upcoming reservations

2. **Seat from Waitlist** (Primary Demo)
   - Select: Christopher Moore (Party of 4)
   - Click: "Get Recommendations"
   - **HIGHLIGHT:** Algorithm shows scored tables:
     ```
     T3: Score 95 — Perfect capacity match, main floor
     T5: Score 85 — Patio alternative, capacity match
     T10: Score 75 — Bar area, capacity match
     ```
   - Allocate to T3
   - Watch table status change to "Occupied"

3. **Confirm Reservation**
   - Find Robert Taylor (7:30 PM, Pending)
   - Allocate table if customer arrives
   - Or mark "No Show" if late

**Key Message:** "AI-powered recommendations reduce decision time by 40%"

---

### Scenario 3: Floor Staff (staff@goldenfork.com)
**Login:** staff@goldenfork.com / Staff123!

**What to Show:**
1. View current table status
2. Find Table T4 (Status: Occupied)
3. Mark as "Available" after cleanup
4. Explain: Host dashboard updates instantly

**Key Message:** "Real-time coordination eliminates communication gaps"

---

### Scenario 4: Manager (manager@goldenfork.com)
**Login:** manager@goldenfork.com / Manager123!

**What to Show:**
1. **Dashboard Metrics**
   - Today's reservations: 7 total
   - Completed: 3
   - Active/upcoming: 4
   - Waitlist: 3 entries
   - Table utilization: 75%

2. **All Reservations View**
   - Filter by status
   - Filter by date range
   - Search by customer name

3. **Table Configuration**
   - View all 12 tables
   - Show ability to add/edit tables
   - Demonstrate status management

4. **Operational Control**
   - Override any reservation
   - View all staff members
   - Access audit logs

**Key Message:** "Managers get complete visibility and control for data-driven decisions"

---

## Allocation Algorithm Demo Data

### Expected Scores for Christopher Moore (Party of 4)

| Table | Capacity | Location | Capacity Score | Location Score | Recency Score | **Total Score** | Recommendation |
|-------|----------|----------|----------------|----------------|---------------|-----------------|----------------|
| **T3** | 4 | Main Floor | 100 | 90 | 95 | **95** | ⭐ Best choice |
| **T5** | 4 | Patio | 100 | 75 | 80 | **85** | Good alternative |
| **T10** | 4 | Bar Area | 100 | 60 | 70 | **75** | Acceptable |
| T8 | 8 | Main Floor | 50 | 90 | 95 | 72 | Too large |
| T7 | 6 | Private | 67 | 80 | 85 | 71 | Slightly too large |
| T1 | 2 | Window | 25 | 100 | 100 | 60 | Too small |

**Scoring Formula:**
```
Total Score = 0.50 × Capacity_Match_Score
            + 0.30 × Location_Preference_Score
            + 0.20 × Recency_Score
```

**Why T3 wins:**
- Perfect capacity match (4 seats for 4 people)
- Premium main floor location
- Recently turned, evenly distributed usage

---

## Edge Cases and Error Scenarios

### 1. No Available Tables
**Setup:** All tables occupied or reserved  
**Expected:** "No suitable tables available" message  
**Demo:** Explain waitlist grows, host calls customers

### 2. Late Reservation (No Show)
**Setup:** Robert Taylor 7:30 PM (Pending)  
**Action:** Host marks "No Show" after grace period  
**Expected:** Table returns to available pool  
**Demo:** Show audit logging of the event

### 3. Table Maintenance Emergency
**Setup:** T11 already in "Maintenance" status  
**Action:** Show how it's excluded from allocations  
**Expected:** Algorithm doesn't recommend T11  
**Demo:** Explain reactivation process

### 4. Concurrent Seating Attempts
**Setup:** Two hosts try to seat same table  
**Expected:** Database transaction prevents double-booking  
**Demo:** Explain (hard to demo live without 2 browsers)

### 5. Large Party (>8 people)
**Setup:** Try adding Party of 10 to waitlist  
**Expected:** No single table fits  
**Demo:** Explain current limitation, future table-combining feature

---

## Database State After Seed

### Counts
- **Restaurants:** 1 (The Golden Fork)
- **Users:** 12 total (3 staff + 9 customers)
- **Restaurant Memberships:** 3 (manager, host, floor_staff)
- **Tables:** 12 (T1-T12)
- **Reservations:** 8 (3 completed, 4 confirmed, 1 pending)
- **Waitlist Entries:** 3 (all waiting)
- **Revoked Tokens:** 0
- **Audit Events:** 0 (will populate as actions occur)

### Table Status Distribution
- Available: 9 tables (75%)
- Occupied: 1 table (8%)
- Reserved: 1 table (8%)
- Maintenance: 1 table (8%)

---

## Resetting Demo Data

### If Demo Data Gets Corrupted

**Full Reset:**
```powershell
cd backend
Remove-Item instance\occupie_dev.db
flask db upgrade
python seed_demo_data.py
```

**Verify Reset:**
```powershell
python run.py
# In new terminal:
curl http://localhost:5000/api/health
# Should return: {"status": "healthy"}
```

### Quick Verification Commands

**Check if data exists:**
```powershell
# Start Python shell
python
>>> from app import create_app, db
>>> from app.models import User, Restaurant, RestaurantTable
>>> app = create_app()
>>> with app.app_context():
...     print(f"Restaurants: {Restaurant.query.count()}")
...     print(f"Users: {User.query.count()}")
...     print(f"Tables: {RestaurantTable.query.count()}")
```

**Expected output:**
```
Restaurants: 1
Users: 12
Tables: 12
```

---

## Common Demo Issues

### Issue 1: Login Fails
**Symptom:** "Invalid credentials"  
**Cause:** Demo data not seeded  
**Fix:** Run `python seed_demo_data.py`

### Issue 2: Empty Waitlist
**Symptom:** No waitlist entries visible  
**Cause:** Data was cleared  
**Fix:** Re-run seed script

### Issue 3: All Tables Unavailable
**Symptom:** Can't allocate any tables  
**Cause:** Previous demo actions changed statuses  
**Fix:** Reset database and re-seed

### Issue 4: Reservation Times in Past
**Symptom:** Reservations show as overdue  
**Cause:** Demo was created days ago  
**Fix:** Seed script uses relative times (should be today)  
**Verify:** Check `created_at` uses `datetime.utcnow()`

---

## Tips for a Smooth Demo

### Before Demo
1. ✅ Run seed script fresh
2. ✅ Login as each role to verify
3. ✅ Check Christopher Moore is in waitlist position 2
4. ✅ Verify Table T4 is occupied (for floor staff demo)
5. ✅ Confirm Sarah has 7:00 PM reservation

### During Demo
1. 🎯 Start with customer (simplest view)
2. 🎯 Move to host (most impressive feature)
3. 🎯 Use Christopher Moore for allocation demo
4. 🎯 Show floor staff (quick coordination demo)
5. 🎯 End with manager (big picture)

### After Demo
1. 📊 Offer to show test suite
2. 📊 Offer to show code (allocation.py)
3. 📊 Keep servers running for judge exploration
4. 📊 Be ready for technical deep-dive

---

**This reference contains all demo data details. Print and keep handy during presentation!** 🎯
