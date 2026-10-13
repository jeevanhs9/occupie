# GitHub to Vercel Deployment Guide

Step-by-step guide to push your Occupie project to GitHub and deploy to Vercel.

---

## Step 1: Verify Everything Works Locally

Before deploying, ensure everything works on your machine:

```powershell
# Test backend
cd E:\Occupie\backend
.\venv\Scripts\Activate.ps1
pytest -v

# Expected: 87 passed

# Build frontend
cd ..\frontend
npm run build

# Expected: dist/index.html created, ~329 KB bundle
```

---

## Step 2: Initialize Git Repository (if not done)

```powershell
cd E:\Occupie

# Check if git is already initialized
git status

# If "not a git repository", initialize:
git init
git branch -M main
```

---

## Step 3: Review What Will Be Committed

```powershell
# See what's staged
git status

# Should see:
# - All source files
# - Configuration files (vercel.json, package.json)
# - Documentation

# Should NOT see (excluded by .gitignore):
# - node_modules/
# - venv/
# - .env files (only .env.example should be included)
# - *.db files
# - __pycache__/
```

---

## Step 4: Commit All Files

```powershell
# Add all files
git add .

# Commit
git commit -m "Initial commit: Occupie restaurant management system ready for Vercel deployment"

# Verify commit
git log -1
```

---

## Step 5: Create GitHub Repository

### Option A: Using GitHub CLI (Recommended)

```powershell
# Install GitHub CLI if not installed
# https://cli.github.com/

# Login
gh auth login

# Create repository
gh repo create occupie --public --source=. --remote=origin --push

# Done! Your code is now on GitHub
```

### Option B: Using GitHub Website

1. Go to https://github.com/new
2. Repository name: `occupie`
3. Description: "Restaurant management system with intelligent table allocation"
4. Visibility: **Public** (or Private if preferred)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

Then push your local repository:

```powershell
# Replace YOUR-USERNAME with your GitHub username
git remote add origin https://github.com/YOUR-USERNAME/occupie.git

# Push to GitHub
git push -u origin main
```

---

## Step 6: Verify on GitHub

1. Open your repository: `https://github.com/YOUR-USERNAME/occupie`
2. Check that you see:
   - ✅ `vercel.json` in root
   - ✅ `package.json` in root
   - ✅ `frontend/` directory
   - ✅ `backend/` directory
   - ✅ `docs/` directory
   - ✅ README.md with deployment section

---

## Step 7: Deploy to Vercel

### 7.1. Sign up for Vercel

1. Go to https://vercel.com/signup
2. Sign up with GitHub (easiest - auto-connects)
3. Authorize Vercel to access your repositories

### 7.2. Import Project

1. Once logged in, click **"Add New..."** → **"Project"**
2. Find your **occupie** repository in the list
3. Click **"Import"**

### 7.3. Configure Project

**Build & Development Settings:**
- Framework Preset: **Vite** (auto-detected)
- Root Directory: **`./`** (leave as monorepo root)
- Build Command: (leave default - vercel.json handles it)
- Output Directory: **`frontend/dist`**
- Install Command: (leave default)

Click **"Deploy"** for now - we'll add environment variables after first deployment.

### 7.4. Wait for First Deployment

- Build will complete in 2-3 minutes
- Frontend will work
- Backend will show errors (expected - needs environment variables)

---

## Step 8: Add Database

### 8.1. Create Vercel Postgres

1. In your project dashboard, click **"Storage"** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Name: `occupie-db`
5. Region: Choose closest to your users
6. Click **"Create"**

### 8.2. Verify Database Connection

- Go to **Storage** → **Postgres**
- Click your database
- You should see connection string automatically added to your project

---

## Step 9: Configure Environment Variables

### 9.1. Generate Secret Keys

In PowerShell, generate two strong keys:

```powershell
# Generate SECRET_KEY
$secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "SECRET_KEY=$secretKey"

# Generate JWT_SECRET_KEY
$jwtKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "JWT_SECRET_KEY=$jwtKey"

# Save these somewhere secure!
```

### 9.2. Add Environment Variables in Vercel

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

**For Production + Preview:**

| Variable | Value | Notes |
|----------|-------|-------|
| `FLASK_ENV` | `production` | Required |
| `APP_ENV` | `production` | Required |
| `SECRET_KEY` | *paste your generated key* | Required - 32+ chars |
| `JWT_SECRET_KEY` | *paste your other generated key* | Required - different from SECRET_KEY |
| `SESSION_COOKIE_SECURE` | `True` | Required for HTTPS |
| `SESSION_COOKIE_SAMESITE` | `None` | Required for cross-origin |
| `DEFAULT_RESTAURANT_NAME` | `Your Restaurant Name` | Optional |

3. Click **"Save"** for each

**Note:** `DATABASE_URL` is automatically set by Vercel Postgres - you don't need to add it manually.

---

## Step 10: Redeploy with Environment Variables

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Select **"Redeploy"**
4. Uncheck **"Use existing Build Cache"**
5. Click **"Redeploy"**

Wait 2-3 minutes for new deployment.

---

## Step 11: Verify Deployment

### 11.1. Check Frontend

Visit your deployment URL (shown in Vercel dashboard):
```
https://your-project-name.vercel.app
```

You should see the Occupie landing page.

### 11.2. Check API Health

Test the API:
```
https://your-project-name.vercel.app/api/health
```

Expected response:
```json
{"status": "ok", "database": "connected"}
```

✅ If you see this, your backend is working!

---

## Step 12: Initialize Database Schema

Your database exists but is empty. You need to create tables.

### Method 1: Using Vercel Postgres Query Editor

1. Go to **Storage** → **Postgres** → **Data** tab
2. Click **"Query"**
3. Copy SQL from `backend/migrations/versions/db6499397870_initial_occupie_auth_and_operations_.py`
4. Execute the `upgrade()` SQL

### Method 2: Using External SQL Client

1. Get connection string:
   - **Storage** → **Postgres** → **Settings**
   - Copy **Connection String** (click "Show Secret")

2. Use psql, pgAdmin, DBeaver, or TablePlus:
   ```bash
   psql "your-connection-string"
   ```

3. Run migrations from your migration files

---

## Step 13: Create First Admin User

Connect to database and run:

```sql
-- Create default restaurant
INSERT INTO restaurants (id, name, created_at) 
VALUES (1, 'Your Restaurant', NOW())
ON CONFLICT DO NOTHING;

-- Create admin user
-- First, generate password hash in Python:
-- from werkzeug.security import generate_password_hash
-- print(generate_password_hash("YourSecurePassword123!"))

INSERT INTO users (name, email, password_hash, role, created_at)
VALUES (
  'Admin Manager',
  'admin@yourrestaurant.com',
  'scrypt:32768:8:1$YOUR_GENERATED_HASH',
  'staff',
  NOW()
);

-- Create manager membership
INSERT INTO restaurant_memberships (user_id, restaurant_id, role, created_at)
SELECT 
  id,
  1,
  'manager',
  NOW()
FROM users 
WHERE email = 'admin@yourrestaurant.com';
```

---

## Step 14: Test Your Live Application

### 14.1. Register as Customer

1. Go to your app URL
2. Click **"Get Started"** or **"Register"**
3. Fill in:
   - Name: Test Customer
   - Email: test@example.com
   - Password: Test123!
4. Click **"Register"**

You should be redirected to customer dashboard.

### 14.2. Login as Manager

1. Click **"Logout"**
2. Click **"Login"**
3. Use admin credentials from Step 13
4. You should see manager dashboard

### 14.3. Test Core Features

**As Manager:**
- ✅ View dashboard
- ✅ Add a table (e.g., Table 1, Capacity 4)
- ✅ View reservations (should be empty)

**As Customer:**
- ✅ Logout and login as test customer
- ✅ Try to create a reservation
- ✅ View upcoming bookings

---

## Step 15: Set Up Custom Domain (Optional)

### 15.1. Add Domain in Vercel

1. Go to **Settings** → **Domains**
2. Enter your domain: `app.yourrestaurant.com`
3. Click **"Add"**

### 15.2. Configure DNS

Vercel will show you DNS records to add. Typically:

```
Type: CNAME
Name: app (or @)
Value: cname.vercel-dns.com
```

Add this record in your domain registrar's DNS settings.

### 15.3. Wait for Verification

- DNS propagation: 5 minutes to 48 hours
- Vercel automatically provisions SSL certificate
- Once verified, your app is live at your custom domain

### 15.4. Update CORS (Important!)

After adding custom domain:

1. Go to **Settings** → **Environment Variables**
2. Add or update:
   ```
   CORS_ALLOWED_ORIGINS=https://app.yourrestaurant.com
   ```
3. Redeploy

---

## Continuous Deployment

Now that you're connected, every push to GitHub will auto-deploy:

```powershell
# Make changes locally
cd E:\Occupie
# ... edit files ...

# Commit and push
git add .
git commit -m "Update feature X"
git push origin main

# Vercel automatically deploys!
# Check deployment status in Vercel dashboard
```

### Branch Deployments

- **main** branch → Production
- **Pull requests** → Preview deployments
- **Other branches** → Can deploy manually

---

## Troubleshooting

### Issue: "Git push rejected"

```powershell
# Pull latest changes first
git pull origin main

# Then push
git push origin main
```

### Issue: "Vercel build failed"

1. Check build logs in Vercel dashboard
2. Common causes:
   - Missing files in repository
   - Incorrect vercel.json configuration
   - npm install failure

### Issue: "Database connection failed"

1. Verify Vercel Postgres is active
2. Check environment variables
3. Look for `DATABASE_URL` or `POSTGRES_URL`

### Issue: "CORS error in browser"

1. Add your Vercel URL to `CORS_ALLOWED_ORIGINS`
2. Redeploy

### Issue: "Can't see my changes"

1. Check if commit was pushed to GitHub:
   ```powershell
   git log origin/main -1
   ```
2. Check Vercel deployment status
3. Hard refresh browser (Ctrl+Shift+R)

---

## Next Steps

### Immediate
- [ ] Seed demo data (use `seed_demo_data.py` adapted for production)
- [ ] Create staff accounts (host, floor staff)
- [ ] Configure tables for your restaurant
- [ ] Test all workflows

### Soon
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Schedule database backups
- [ ] Train staff on the system
- [ ] Gather user feedback

### Production Readiness
- [ ] Complete [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Disaster recovery plan

---

## Helpful Commands

```powershell
# Check Git status
git status

# See what would be committed
git diff --cached

# Commit specific files only
git add file1.txt file2.txt
git commit -m "Update specific files"

# Undo last commit (keep changes)
git reset --soft HEAD~1

# See deployment logs
# (Use Vercel dashboard)

# Generate secrets
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## Support Resources

- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Complete deployment guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Verification checklist
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - 10-minute quick deploy
- **GitHub Docs:** https://docs.github.com
- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support

---

## Success! 🎉

Your Occupie project is now:
- ✅ Stored on GitHub (version controlled)
- ✅ Deployed to Vercel (live on the internet)
- ✅ Connected for continuous deployment
- ✅ Secured with HTTPS
- ✅ Backed by PostgreSQL database

**Your restaurant management system is live!**

Access it at: `https://your-project-name.vercel.app`

---

**Last Updated:** October 10, 2026  
**Version:** 1.0
