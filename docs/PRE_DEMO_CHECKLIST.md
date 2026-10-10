# Pre-Demo Checklist

## 24 Hours Before Demo

### Environment Setup
- [ ] **Backend virtual environment activated**
  ```powershell
  cd backend
  .\venv\Scripts\Activate.ps1
  ```

- [ ] **All dependencies installed**
  ```powershell
  pip install -r requirements.txt
  ```

- [ ] **Database migrations run**
  ```powershell
  flask db upgrade
  ```

- [ ] **Demo data seeded**
  ```powershell
  python seed_demo_data.py
  ```

- [ ] **Backend server starts successfully**
  ```powershell
  python run.py
  # Should see: Running on http://127.0.0.1:5000
  ```

### Frontend Setup
- [ ] **Dependencies installed**
  ```powershell
  cd frontend
  npm install
  ```

- [ ] **Environment configured**
  ```powershell
  # Verify .env file exists with:
  # VITE_API_BASE_URL=http://localhost:5000
  # VITE_DATA_MODE=api
  ```

- [ ] **Frontend dev server starts**
  ```powershell
  npm run dev
  # Should see: Local: http://localhost:5173
  ```

- [ ] **Production build succeeds**
  ```powershell
  npm run build
  # Should see: dist folder created, ~316 kB
  ```

### Testing
- [ ] **All backend tests pass**
  ```powershell
  cd backend
  .\venv\Scripts\python.exe -m pytest -v
  # Should see: 77 passed
  ```

- [ ] **Quick smoke test**
  - Open http://localhost:5173
  - Login as manager@goldenfork.com / Manager123!
  - Verify dashboard loads
  - Check all 3 sections visible (tables, reservations, waitlist)

### Documentation
- [ ] **Print quick reference card**
  - Print `docs/DEMO_QUICK_REFERENCE.md`
  - Keep next to laptop during demo

- [ ] **Review demo script**
  - Read `docs/DEMO_AND_PRESENTATION_GUIDE.md`
  - Practice 5-minute walkthrough
  - Memorize login credentials

- [ ] **Prepare Q&A answers**
  - Review "Known Limitations" section
  - Practice technical explanations
  - Review business model answers

---

## 1 Hour Before Demo

### System Check
- [ ] **Close unnecessary applications**
  - Close extra browser tabs
  - Close Slack, Discord, email
  - Close resource-heavy apps

- [ ] **Start fresh servers**
  ```powershell
  # Kill any existing processes on ports 5000 and 5173
  # Terminal 1: Backend
  cd backend
  .\venv\Scripts\Activate.ps1
  python run.py
  
  # Terminal 2: Frontend
  cd frontend
  npm run dev
  ```

- [ ] **Verify demo data exists**
  - Login as each role
  - Check waitlist has 3 entries
  - Verify Christopher Moore is in waitlist
  - Confirm Sarah Johnson has 7 PM reservation

### Browser Setup
- [ ] **Use clean browser profile** (recommended)
  - No extensions that might interfere
  - Clear cache if using regular profile
  - Zoom level at 100%

- [ ] **Open demo tabs**
  - Tab 1: http://localhost:5173 (main demo)
  - Tab 2: http://localhost:5173 (backup if needed)
  - Tab 3: GitHub repo (if showing code)

- [ ] **Test all login flows**
  - Manager login → Dashboard loads
  - Host login → Dashboard loads
  - Customer login → Dashboard loads
  - Logout works

### Presentation Materials
- [ ] **Quick reference card** printed and visible
- [ ] **Laptop fully charged** (or plugged in)
- [ ] **Display mirroring works** (if presenting on screen)
- [ ] **Screen resolution appropriate** (1920x1080 recommended)
- [ ] **Font sizes readable** (increase browser zoom if needed)

### Backup Plans
- [ ] **Screenshots ready** (in case of technical issues)
  - Manager dashboard
  - Host allocation screen
  - Customer reservation view

- [ ] **Video recording** (optional backup)
  - Record successful demo run
  - Have ready if live demo fails

- [ ] **Offline documentation**
  - PDF exports of key docs
  - Architecture diagrams saved as images

---

## 15 Minutes Before Demo

### Final Checks
- [ ] **Both servers running** (backend + frontend)
- [ ] **Browser on http://localhost:5173** 
- [ ] **Logged out** (start demo fresh)
- [ ] **Quick reference card** next to keyboard
- [ ] **Water nearby** (stay hydrated!)

### Mental Preparation
- [ ] **Review opening statement** (30 seconds)
  > "Occupie solves restaurant coordination chaos..."

- [ ] **Remember 3 key points**
  1. Adaptive allocation engine
  2. Real-time multi-role coordination
  3. Production-ready (77 tests passing)

- [ ] **Breathe** — You've got this! 💪

---

## During Demo

### Stay Calm Protocol
- If something breaks: Stay calm, use backup tab
- If login fails: Use alternate account (all customers same password)
- If allocation doesn't show: Explain algorithm verbally, show code
- If catastrophic failure: Switch to screenshots/video

### Remember to Mention
- ✅ 77/77 tests passing
- ✅ 316 KB optimized build
- ✅ Multi-tenant architecture
- ✅ Security: HTTP-only cookies, CSRF, role-based auth
- ✅ Real-world problem: 20% capacity waste in restaurants

### Don't Forget
- **Speak clearly** — Judges may be listening remotely
- **Show confidence** — You built this!
- **Pause for questions** — Don't rush
- **Point to screen** — Help judges follow along
- **Smile** — Enthusiasm is contagious!

---

## After Demo

### Cool Down
- [ ] **Don't close servers** (in case judges want to try)
- [ ] **Be ready for follow-up questions**
- [ ] **Offer to show code** (if they're interested)

### If Requested
- [ ] Show test suite running
- [ ] Show `adaptive_allocation.py` code
- [ ] Walk through database schema
- [ ] Demonstrate mobile responsiveness
- [ ] Show production build stats

---

## Emergency Contacts

**Technical Issues:**
- Backend port occupied: Try port 5001 in config
- Frontend won't start: Clear node_modules, reinstall
- Database corrupt: Delete DB, re-run migrations + seed

**Reset Demo Data:**
```powershell
cd backend
Remove-Item instance\occupie_dev.db
flask db upgrade
python seed_demo_data.py
```

---

## Post-Demo Notes

Use this space to jot down:
- Questions you couldn't answer
- Features judges were most excited about
- Suggestions for improvement
- Follow-up items

---

**Good luck! You've prepared thoroughly. Trust your work.** 🚀
