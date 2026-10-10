# Occupie Demo Quick Reference Card

## 🔑 Demo Accounts (Print This!)

### Staff Login Credentials
```
Manager:     manager@goldenfork.com     / Manager123!
Host:        host@goldenfork.com        / Host123!
Floor Staff: staff@goldenfork.com       / Staff123!
```

### Customer Login Credentials
```
Customer 1:  sarah.johnson@email.com    / Customer123!
Customer 2:  michael.chen@email.com     / Customer123!
Customer 3:  emily.rodriguez@email.com  / Customer123!

All customers: Password = Customer123!
```

---

## 🎯 5-Minute Demo Flow

### 1. Customer Journey (2 min)
- [ ] Login as: `sarah.johnson@email.com`
- [ ] Show existing 7:00 PM reservation (Party of 4)
- [ ] Navigate to "My Reservations"
- [ ] Point out: Status, Table assignment, Cancel option

### 2. Host Operations (2 min)
- [ ] Logout → Login as: `host@goldenfork.com`
- [ ] Show: 3 waitlist entries, 5 pending reservations
- [ ] **KEY DEMO:** Click waitlist entry "Christopher Moore"
- [ ] Click "Get Recommendations"
- [ ] **HIGHLIGHT:** Algorithm scores tables (T3: 95, T5: 85, T10: 75)
- [ ] Allocate to T3 → Watch status change to "Occupied"

### 3. Floor Staff (1 min)
- [ ] Logout → Login as: `staff@goldenfork.com`
- [ ] Find Table T4 (Currently: Occupied)
- [ ] Click "Mark as Available"
- [ ] **HIGHLIGHT:** Instant update to host dashboard

---

## 📊 Key Talking Points

### Problem Statement
"Restaurants waste 20% of seating capacity due to poor table allocation"

### Our Solution
1. **Adaptive Allocation** — Smart scoring algorithm (capacity + location + recency)
2. **Real-Time Sync** — Host and floor staff coordinate seamlessly
3. **Role-Based Access** — 4 dashboards for 4 different roles
4. **Production Ready** — 77 tests passing, security hardened

### Technical Highlights
- **Backend:** Flask 3.0, SQLAlchemy, JWT auth
- **Frontend:** React 18, Vite, TailwindCSS
- **Security:** HTTP-only cookies, CSRF protection, role-based auth
- **Quality:** 77/77 tests passing, 316 KB optimized build

---

## 🎤 Opening Statement (30 seconds)

> "Occupie solves restaurant coordination chaos. When a party of 4 walks in, our adaptive allocation engine scores every table based on capacity match, location preference, and usage patterns—then recommends the optimal choice. Hosts make faster decisions, customers wait less, and restaurants turn tables 15% more efficiently."

---

## ❓ Common Judge Questions

**Q: How do you prevent overbooking?**
A: 90-minute reservation windows + database-level unique constraints + transaction isolation

**Q: What about large parties (10+ people)?**
A: Current: Manual table combining | Future: Auto-adjacent table suggestions

**Q: Can you scale to restaurant chains?**
A: Yes! Multi-tenant architecture—single deployment, data isolated by restaurant_id

**Q: Security concerns?**
A: HTTP-only cookies (XSS protection), CSRF tokens, password hashing, role-based auth, audit logging

**Q: Why Flask over Django?**
A: Lighter, API-first design, faster iteration, better for microservices evolution

**Q: Production ready?**
A: Yes. 77 automated tests, PostgreSQL support, migration system, security hardened

---

## 🛠️ Demo Data Summary

### Restaurant: The Golden Fork
- 12 tables (T1-T12)
- Capacities: 2, 4, 6, 8 seats
- Locations: Window, Main Floor, Patio, Bar, Private

### Today's Schedule
- **Completed:** 3 reservations (12 PM, 1:30 PM, 6 PM)
- **Active:** Sarah Johnson 7 PM (Confirmed)
- **Pending:** Robert Taylor 7:30 PM
- **Upcoming:** 2 more confirmed (8 PM, 8:30 PM)

### Waitlist (Current)
1. Amanda Wilson — Party of 2 — 15 min
2. Christopher Moore — Party of 4 — 25 min ← **Use this for demo**
3. Patricia Garcia — Party of 6 — 35 min

### Table Status at Demo Start
- Available: T1, T2, T3, T5, T7, T8, T9, T10, T12 (9 tables)
- Occupied: T4
- Reserved: T6 (Sarah's 7 PM reservation)
- Maintenance: T11

---

## 🚨 Emergency Troubleshooting

### Server won't start
```powershell
cd backend
.\venv\Scripts\Activate.ps1
flask db upgrade
python run.py
```

### Login not working
- Check: Is backend running on port 5000?
- Check: Is frontend pointing to correct API URL?
- Reset: Delete `instance/occupie_dev.db`, run migrations, re-seed

### Demo data missing
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python seed_demo_data.py
```

### Fresh start (nuclear option)
```powershell
# Backend
cd backend
Remove-Item instance\occupie_dev.db
flask db upgrade
python seed_demo_data.py

# Frontend
cd frontend
Remove-Item -Recurse node_modules
npm install
```

---

## 📱 Mobile Demo Tip

If judges want to see mobile responsiveness:
1. Open browser dev tools (F12)
2. Toggle device emulation (Ctrl+Shift+M)
3. Select iPhone or Android device
4. Show responsive layout adapts perfectly

---

## 🎬 Closing Statement (30 seconds)

> "Occupie is production-ready today for independent restaurants and architected to scale to chains. We've proven the core—intelligent allocation, real-time coordination, secure multi-tenant architecture. Next steps include predictive wait times with ML, SMS notifications, and native mobile apps. Thank you."

---

## 📞 Follow-Up Info

**Documentation:** See `/docs` folder (7 comprehensive guides)  
**Tests:** `pytest -v` (77/77 passing)  
**Build:** `npm run build` (316.25 kB)  
**Source:** [Your GitHub URL]

---

**Print this card and keep it next to your laptop during the demo!** ✨
