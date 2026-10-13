# Quick Deploy to Vercel

Get Occupie running on Vercel in **under 10 minutes**.

---

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- 2 strong random keys (we'll generate these)

---

## Step 1: Generate Secret Keys (1 minute)

Open PowerShell and generate two strong keys:

```powershell
# Generate SECRET_KEY
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Generate JWT_SECRET_KEY (run again for different key)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Save these keys** - you'll need them in Step 4.

---

## Step 2: Push to GitHub (2 minutes)

```powershell
cd E:\Occupie

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for Vercel deployment"

# Create GitHub repository and push
# (Follow GitHub instructions to create new repo)
git remote add origin https://github.com/YOUR-USERNAME/occupie.git
git branch -M main
git push -u origin main
```

---

## Step 3: Import to Vercel (2 minutes)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your **Occupie** repository
4. Click **"Import"**
5. Project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (keep as-is)
   - **Build Command:** (leave default)
   - **Output Directory:** `frontend/dist`
6. Click **"Deploy"** (we'll add environment variables next)

**First deployment will succeed for frontend but backend needs configuration.**

---

## Step 4: Add Database (2 minutes)

1. In Vercel dashboard, go to **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Name it: `occupie-db`
5. Select region: (choose closest to your users)
6. Click **"Create"**

Vercel automatically connects the database to your project.

---

## Step 5: Configure Environment Variables (3 minutes)

1. Go to **Settings** → **Environment Variables**
2. Add these variables for **Production** and **Preview**:

| Variable | Value |
|----------|-------|
| `FLASK_ENV` | `production` |
| `APP_ENV` | `production` |
| `SECRET_KEY` | *paste first key from Step 1* |
| `JWT_SECRET_KEY` | *paste second key from Step 1* |
| `SESSION_COOKIE_SECURE` | `True` |
| `SESSION_COOKIE_SAMESITE` | `None` |
| `DEFAULT_RESTAURANT_NAME` | *Your Restaurant Name* |

3. Click **"Save"**

---

## Step 6: Redeploy (1 minute)

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on latest deployment
3. Select **"Redeploy"**
4. Check **"Use existing Build Cache"** = NO
5. Click **"Redeploy"**

Wait 2-3 minutes for build to complete.

---

## Step 7: Verify Deployment (1 minute)

1. Click **"Visit"** button to open your app
2. Test API health:
   ```
   https://your-app.vercel.app/api/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

3. Try the landing page - should load correctly

---

## Step 8: Initialize Database (Manual - One Time)

Connect to your Postgres database and run the initial schema.

### Option A: Using Vercel Dashboard

1. Go to **Storage** → **Postgres** → **Data** tab
2. Click **"Query"**
3. Copy SQL from `backend/migrations/versions/db6499397870_initial_occupie_auth_and_operations_.py`
4. Execute the `upgrade()` function SQL

### Option B: Using Database Client

1. Get connection string:
   - **Storage** → **Postgres** → **Settings** → **Connection String**
2. Use tool like pgAdmin, DBeaver, or psql
3. Run schema creation SQL

**Tables needed:**
- `users`
- `restaurants`
- `restaurant_memberships`
- `restaurant_tables`
- `reservations`
- `waitlist_entries`
- `revoked_tokens`
- `audit_events`

---

## Step 9: Create First Admin Account (Manual - One Time)

Run SQL to create your manager account:

```sql
-- 1. Create default restaurant
INSERT INTO restaurants (id, name, created_at) 
VALUES (1, 'Your Restaurant Name', NOW())
ON CONFLICT DO NOTHING;

-- 2. Create admin user (password: "Admin123!" hashed)
INSERT INTO users (name, email, password_hash, role, created_at)
VALUES (
  'Admin User',
  'admin@yourrestaurant.com',
  'scrypt:32768:8:1$EXAMPLE_HASH', -- Use proper hash from werkzeug
  'staff',
  NOW()
);

-- 3. Get user ID and create membership
INSERT INTO restaurant_memberships (user_id, restaurant_id, role, created_at)
VALUES (
  (SELECT id FROM users WHERE email = 'admin@yourrestaurant.com'),
  1,
  'manager',
  NOW()
);
```

**Generate proper password hash:**
```python
from werkzeug.security import generate_password_hash
print(generate_password_hash("YourPassword123!"))
```

---

## Step 10: Test Complete System

1. **Register as customer:**
   - Go to your app URL
   - Click "Get Started" or "Register"
   - Create account

2. **Login:**
   - Use registered email/password
   - Should see customer dashboard

3. **Test manager account:**
   - Logout
   - Login with admin account created in Step 9
   - Should see manager dashboard with full access

4. **Test key workflows:**
   - Create a reservation (as customer)
   - View reservations (as manager)
   - Add table (as manager)

---

## Done! 🎉

Your Occupie instance is now live at:
```
https://your-app.vercel.app
```

---

## Next Steps

### Immediate
- [ ] Create staff accounts (host, floor staff)
- [ ] Configure tables for your restaurant
- [ ] Test all four role dashboards
- [ ] Set up custom domain (optional)

### Soon
- [ ] Schedule database backups
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Train staff on system
- [ ] Import existing reservations (if any)

### Production Readiness
- [ ] Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [ ] Complete all security items
- [ ] Test disaster recovery
- [ ] Document support procedures

---

## Troubleshooting

### "Database connection failed"
- **Fix:** Verify `DATABASE_URL` or `POSTGRES_URL` is set in environment variables
- **Check:** Storage tab shows database is active

### "CORS error"
- **Fix:** Add `CORS_ALLOWED_ORIGINS=https://your-app.vercel.app` to environment variables

### "Login not working"
- **Fix:** Verify `SECRET_KEY` and `JWT_SECRET_KEY` are set and different from each other
- **Check:** Cookies are being set (check browser DevTools → Application → Cookies)

### "API returns 404"
- **Fix:** Verify `vercel.json` exists in repository root
- **Redeploy** after confirming file is committed

### Need more help?
- See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete guide
- Check [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed steps

---

**Total Time:** ~10 minutes + database setup time

**Cost:** $0/month on free tier (sufficient for small restaurants)
