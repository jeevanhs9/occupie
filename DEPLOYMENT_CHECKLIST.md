# Occupie Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

---

## Pre-Deployment (Local)

### 1. Code Quality
- [ ] All backend tests passing (87/87)
  ```powershell
  cd backend
  .\venv\Scripts\Activate.ps1
  pytest -v
  ```
- [ ] Frontend builds successfully
  ```powershell
  cd frontend
  npm run build
  ```
- [ ] No console errors in browser
- [ ] All four dashboards load correctly

### 2. Environment Configuration
- [ ] Review `.env.vercel.example`
- [ ] Prepare strong `SECRET_KEY` (32+ characters)
- [ ] Prepare strong `JWT_SECRET_KEY` (different from SECRET_KEY)
- [ ] Database provider selected (Vercel Postgres recommended)

### 3. Git Repository
- [ ] All changes committed
  ```powershell
  git status
  git add .
  git commit -m "Prepare for Vercel deployment"
  ```
- [ ] Pushed to GitHub
  ```powershell
  git push origin main
  ```
- [ ] Repository is public or Vercel has access

---

## Vercel Setup

### 4. Project Import
- [ ] Logged into [vercel.com](https://vercel.com)
- [ ] Imported GitHub repository
- [ ] Framework preset: **Vite**
- [ ] Root directory: **`./`** (monorepo root)
- [ ] Build command: (use default from vercel.json)
- [ ] Output directory: **`frontend/dist`**

### 5. Database Setup
- [ ] Vercel Postgres database created
- [ ] Database name recorded
- [ ] `POSTGRES_URL` automatically set (verify in Settings → Environment Variables)

OR

- [ ] External PostgreSQL database provisioned
- [ ] Connection string secured
- [ ] `DATABASE_URL` added to Vercel environment variables

### 6. Environment Variables

#### Essential (Required)
- [ ] `FLASK_ENV=production`
- [ ] `APP_ENV=production`
- [ ] `SECRET_KEY=<your-secret-key>` (Production + Preview)
- [ ] `JWT_SECRET_KEY=<your-jwt-secret>` (Production + Preview)
- [ ] `DATABASE_URL=<postgres-connection-string>` (if not using Vercel Postgres)

#### Security (Required)
- [ ] `SESSION_COOKIE_SECURE=True`
- [ ] `SESSION_COOKIE_SAMESITE=None`
- [ ] `SESSION_COOKIE_HTTPONLY=True`

#### Optional (Recommended)
- [ ] `CORS_ALLOWED_ORIGINS=<your-vercel-url>`
- [ ] `DEFAULT_RESTAURANT_NAME=<your-restaurant-name>`
- [ ] `DEFAULT_TURN_TIME_MINUTES=75`
- [ ] `DEFAULT_RESERVATION_WINDOW_MINUTES=90`
- [ ] `GRACE_PERIOD_MINUTES=15`

---

## First Deployment

### 7. Deploy
- [ ] Click **"Deploy"** button in Vercel
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Check build logs for errors
- [ ] Deployment successful (green checkmark)

### 8. Verify Deployment
- [ ] Visit deployment URL
- [ ] Landing page loads correctly
- [ ] No 404 errors in browser console
- [ ] API health check responds
  ```bash
  curl https://your-app.vercel.app/api/health
  ```
  Expected: `{"status":"ok","database":"connected"}`

---

## Post-Deployment Setup

### 9. Database Migrations

#### Option A: Manual SQL Execution
- [ ] Connect to Postgres database
- [ ] Run migration SQL from `backend/migrations/versions/`
- [ ] Verify tables created:
  - `users`
  - `restaurants`
  - `restaurant_memberships`
  - `restaurant_tables`
  - `reservations`
  - `waitlist_entries`
  - `revoked_tokens`
  - `audit_events`

#### Option B: Vercel CLI (Advanced)
```powershell
vercel login
vercel link
vercel env pull .env.production
cd backend
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('Tables created')"
```

### 10. Seed Initial Data
- [ ] Create default restaurant record
- [ ] Create initial manager account
  ```sql
  INSERT INTO restaurants (id, name, created_at) 
  VALUES (1, 'Your Restaurant', NOW());
  
  -- Then create user and membership (use hashed password)
  ```

### 11. Test Authentication
- [ ] Register new customer account
- [ ] Login successful
- [ ] JWT cookies set correctly
- [ ] Logout works
- [ ] Session persists on refresh

### 12. Test Core Workflows

#### Customer Flow
- [ ] Register account
- [ ] Create reservation
- [ ] View upcoming bookings
- [ ] Cancel reservation
- [ ] View history

#### Host Flow
- [ ] Login as host
- [ ] View table status
- [ ] Add walk-in to waitlist
- [ ] Get seating recommendations
- [ ] Seat customer
- [ ] Update reservation status

#### Manager Flow
- [ ] Login as manager
- [ ] View dashboard metrics
- [ ] Configure tables
- [ ] View all reservations
- [ ] Export reports (if implemented)

#### Floor Staff Flow
- [ ] Login as floor staff
- [ ] View assigned tables
- [ ] Update table status
- [ ] Mark table available

---

## Performance & Monitoring

### 13. Performance Check
- [ ] Frontend loads in <3 seconds
- [ ] API responses <500ms for most requests
- [ ] No 5xx errors in function logs
- [ ] Database queries optimized (check slow query log)

### 14. Enable Monitoring (Optional)
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring (UptimeRobot, etc.)

---

## Security Hardening

### 15. Security Verification
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Cookies marked as `Secure` and `HttpOnly`
- [ ] CORS restricted to your domain only
- [ ] No secrets in frontend bundle
- [ ] SQL injection protection (ORM parameterized queries)
- [ ] CSRF protection enabled
- [ ] Rate limiting configured

### 16. Access Control
- [ ] Customer cannot access staff endpoints
- [ ] Host cannot access manager endpoints
- [ ] Floor staff permissions restricted
- [ ] Data scoped to restaurant ID

---

## Custom Domain (Optional)

### 17. Domain Configuration
- [ ] Domain registered
- [ ] DNS records updated per Vercel instructions
- [ ] SSL certificate active (automatic)
- [ ] Domain verified in Vercel
- [ ] `CORS_ALLOWED_ORIGINS` updated to custom domain

---

## Backup & Recovery

### 18. Backup Strategy
- [ ] Database backup scheduled (daily recommended)
- [ ] Backup restoration tested
- [ ] Deployment rollback plan documented
- [ ] Database connection string saved securely

---

## Documentation

### 19. Update Documentation
- [ ] Production URL added to README
- [ ] Deployment guide reviewed
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Runbook created for common issues

---

## Go-Live

### 20. Launch Preparation
- [ ] All stakeholders informed
- [ ] Staff trained on system
- [ ] Demo data cleared (if used)
- [ ] Production data imported
- [ ] Support channels established

### 21. Post-Launch Monitoring (First 48 hours)
- [ ] Monitor error rates
- [ ] Check function execution times
- [ ] Review user feedback
- [ ] Address any critical bugs
- [ ] Scale resources if needed

---

## Ongoing Maintenance

### 22. Regular Tasks
- [ ] **Weekly:** Review function logs for errors
- [ ] **Weekly:** Check database size and performance
- [ ] **Bi-weekly:** Security updates (dependencies)
- [ ] **Monthly:** Database backup verification
- [ ] **Monthly:** Review and optimize slow queries
- [ ] **Quarterly:** Disaster recovery drill

---

## Troubleshooting Quick Reference

### Common Issues

| Issue | Solution |
|-------|----------|
| 500 Internal Server Error | Check function logs in Vercel dashboard |
| Database connection failed | Verify `DATABASE_URL` environment variable |
| CORS errors | Add your domain to `CORS_ALLOWED_ORIGINS` |
| Login not working | Check `JWT_SECRET_KEY` and cookie settings |
| API returns 404 | Verify `vercel.json` routes configuration |
| Slow performance | Check database connection pooling, add indexes |
| Cold start timeout | Reduce dependencies, consider Vercel Pro |

### Support Resources
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete deployment guide
- [README.md](./README.md) - Project overview
- [API_REFERENCE.md](./docs/API_REFERENCE.md) - API documentation
- Vercel Support: [vercel.com/support](https://vercel.com/support)

---

## Success Criteria

Your deployment is successful when:

✅ All checklist items above are complete  
✅ Application accessible at production URL  
✅ All four role dashboards functional  
✅ Authentication flow works end-to-end  
✅ Reservations can be created and managed  
✅ No critical errors in logs  
✅ Performance meets requirements (<3s page load)  
✅ Security measures implemented  
✅ Backup strategy in place  

**Congratulations! Your Occupie instance is live! 🎉**

---

**Last Updated:** October 10, 2026  
**Version:** 1.0
