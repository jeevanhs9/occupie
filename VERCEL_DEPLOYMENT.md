# Occupie Vercel Deployment Guide

Complete guide to deploying Occupie to Vercel as a full-stack application.

---

## Architecture Overview

Occupie uses a **monorepo structure** optimized for Vercel:

```
E:\Occupie\
├── frontend/          → React + Vite static site
├── backend/           → Flask API (serverless functions)
│   └── api/
│       └── index.py   → Vercel serverless entry point
├── vercel.json        → Vercel configuration
└── .vercelignore      → Deployment exclusions
```

**Deployment Strategy:**
- **Frontend:** Deployed as static files (Vite build output)
- **Backend:** Deployed as Vercel serverless functions (Python)
- **Routing:** `/api/*` → Backend | Everything else → Frontend

---

## Prerequisites

### 1. GitHub Repository

Push your code to GitHub:

```powershell
cd E:\Occupie
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### 2. Vercel Account

- Sign up at [vercel.com](https://vercel.com)
- Install Vercel CLI (optional): `npm install -g vercel`

### 3. PostgreSQL Database

**Option A: Vercel Postgres (Recommended)**
- Easiest integration
- Automatic connection string
- Free tier available

**Option B: External PostgreSQL**
- Supabase (free tier)
- Railway
- Heroku Postgres
- Your own server

---

## Step-by-Step Deployment

### Step 1: Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your **Occupie** repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as monorepo root)
   - **Build Command:** (leave default - handled by vercel.json)
   - **Output Directory:** `frontend/dist`

### Step 2: Add Vercel Postgres (Recommended)

1. In your Vercel project dashboard, go to **Storage**
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose a name (e.g., `occupie-db`)
5. Click **"Create"**

Vercel will automatically set `POSTGRES_URL` environment variable.

### Step 3: Configure Environment Variables

Go to **Settings** → **Environment Variables** and add:

#### Required Backend Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `FLASK_ENV` | `production` | Production |
| `APP_ENV` | `production` | Production |
| `SECRET_KEY` | Generate strong random key | Production, Preview |
| `JWT_SECRET_KEY` | Generate different random key | Production, Preview |
| `DATABASE_URL` | Auto-set if using Vercel Postgres | Production, Preview |

**Generate Secret Keys:**
```powershell
# In PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Or use Python:
```python
import secrets
print(secrets.token_urlsafe(32))
```

#### Optional Backend Variables

| Variable | Value | Default |
|----------|-------|---------|
| `CORS_ALLOWED_ORIGINS` | Your Vercel URL | Auto-detected |
| `DEFAULT_RESTAURANT_NAME` | Your restaurant name | `Occupie Demo` |
| `DEFAULT_TURN_TIME_MINUTES` | Average table turn time | `75` |
| `DEFAULT_RESERVATION_WINDOW_MINUTES` | Reservation protection | `90` |
| `GRACE_PERIOD_MINUTES` | No-show grace period | `15` |

#### Frontend Variables (Optional)

Frontend variables are baked into the build. These are already set correctly:

- `VITE_API_BASE_URL=/api/v1`
- `VITE_AUTH_API_URL=/api/auth`
- `VITE_DATA_MODE=api`

**Important:** Do NOT set `VITE_API_PROXY_TARGET` in Vercel. It's only for local development.

### Step 4: Deploy

Click **"Deploy"** in Vercel dashboard.

Vercel will:
1. Build the frontend (`npm run vercel-build` in `frontend/`)
2. Package the backend as serverless functions
3. Deploy everything to global CDN
4. Set up automatic SSL certificate

**First deployment takes 2-3 minutes.**

### Step 5: Run Database Migrations

After first deployment, run migrations:

#### Option A: Using Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link to your project
cd E:\Occupie
vercel link

# Run migration command
vercel env pull .env.production
python backend/migrations_runner.py
```

#### Option B: Using Database Client

Connect to your Postgres database and run the migration SQL manually:

1. Get connection string from Vercel → Storage → Postgres
2. Use tool like pgAdmin, DBeaver, or `psql`
3. Run the schema from `backend/migrations/versions/`

### Step 6: Create Initial Admin User

After migrations, create your first admin account:

```powershell
# Using Vercel CLI
vercel exec -- python backend/scripts/provision_staff.py \
  --name "Your Name" \
  --email admin@yourdomain.com \
  --role manager
```

Or connect to the database and insert directly (see schema in `backend/app/models/`).

---

## Vercel Project Structure

### File: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "backend/api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/api/index.py" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

### File: `backend/api/index.py`

Entry point for serverless functions. Imports and exposes the Flask app.

### File: `.vercelignore`

Excludes unnecessary files (tests, docs, node_modules) from deployment.

---

## Configuration for Different Environments

### Local Development

```powershell
# Backend
cd backend
.\venv\Scripts\Activate.ps1
python run.py

# Frontend (new terminal)
cd frontend
npm run dev
```

Uses:
- SQLite database (development)
- Vite proxy to localhost:5000
- No CORS restrictions

### Vercel Preview (PR Deployments)

Every pull request gets a preview URL automatically.

- Uses preview environment variables
- Separate database (recommended)
- Automatic SSL

### Vercel Production

Your main branch deployment.

- Uses production environment variables
- Production database
- Custom domain (optional)

---

## Custom Domain Setup (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `app.yourrestaurant.com`)
3. Update DNS records as shown
4. SSL certificate is automatic

Update CORS if using custom domain:
```
CORS_ALLOWED_ORIGINS=https://app.yourrestaurant.com
```

---

## Monitoring & Debugging

### Check Deployment Logs

1. Go to **Deployments** in Vercel dashboard
2. Click on a deployment
3. View **Build Logs** and **Function Logs**

### Test API Health

```bash
curl https://your-app.vercel.app/api/health
```

Should return:
```json
{"status": "ok", "database": "connected"}
```

### Common Issues

#### Issue: "Module not found: app"

**Cause:** Python path not set correctly  
**Fix:** Ensure `backend/api/index.py` has correct path setup:

```python
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
```

#### Issue: Database connection failed

**Cause:** `DATABASE_URL` not set  
**Fix:** Add `DATABASE_URL` in Environment Variables

#### Issue: CORS errors

**Cause:** Frontend and backend on different domains  
**Fix:** Set `CORS_ALLOWED_ORIGINS` to your Vercel URL

#### Issue: 404 on API calls

**Cause:** Route configuration incorrect  
**Fix:** Verify `vercel.json` routes section

#### Issue: Cold start timeout

**Cause:** Serverless function taking too long to initialize  
**Fix:** 
- Reduce dependencies in `requirements-vercel.txt`
- Use Vercel Pro for longer timeouts
- Consider edge functions for faster response

---

## Performance Optimization

### 1. Frontend Optimization

Already implemented:
- Code splitting (React, Motion chunks)
- Lazy loading for dashboard routes
- Optimized build: 329 KB gzipped

### 2. Backend Optimization

**Use connection pooling:**
```python
# In backend/app/config.py
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 5,
    'pool_recycle': 300,
    'pool_pre_ping': True,
}
```

**Enable caching:**
```python
# Use Vercel KV for rate limiting and caching
# Instead of in-memory storage
```

### 3. Database Optimization

- Add indexes on frequently queried fields
- Use connection pooling (PgBouncer)
- Enable query caching

---

## Security Checklist

Before going live:

- [ ] Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Enable `SESSION_COOKIE_SECURE=True`
- [ ] Set `SESSION_COOKIE_SAMESITE=None` for cross-origin
- [ ] Configure `CORS_ALLOWED_ORIGINS` to your domain only
- [ ] Use PostgreSQL (not SQLite) in production
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Review all environment variables
- [ ] Test authentication flows
- [ ] Set up database backups

---

## Scaling Considerations

### Free Tier Limits

**Vercel Free:**
- 100 GB bandwidth/month
- 100 hours serverless function execution
- 6,000 function invocations/day
- 10-second function timeout

**Sufficient for:**
- Small to medium restaurants
- ~1,000 reservations/month
- ~100 concurrent users

### When to Upgrade

**Vercel Pro ($20/month):**
- Unlimited bandwidth
- 1,000 hours function execution
- 100,000 invocations/day
- 60-second timeout

**Recommended for:**
- Restaurant chains (3+ locations)
- High-traffic operations
- >5,000 reservations/month

### Database Scaling

**Vercel Postgres:**
- Free: 256 MB, 60 hours compute
- Pro: 1 GB, 100 hours compute
- Enterprise: Custom

**External options:**
- Supabase: Free tier with generous limits
- Railway: Pay-as-you-go
- AWS RDS: Fully managed, scalable

---

## Backup & Recovery

### Database Backups

**Vercel Postgres:**
- Automatic daily backups (Pro+)
- Point-in-time recovery

**Manual Backup:**
```bash
# Get connection string from Vercel
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Code Backups

- GitHub serves as version control
- Vercel keeps deployment history
- Download deployment artifacts if needed

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Main branch** → Production
- **Pull requests** → Preview deployments
- **Other branches** → Can configure custom rules

### Deploy Hooks

Create webhooks for external triggers:

1. Go to **Settings** → **Git**
2. Create **Deploy Hook**
3. Use webhook URL to trigger deployments

---

## Cost Estimation

### Example: Small Restaurant (100 seats)

**Monthly Usage:**
- 2,000 reservations
- 500 waitlist entries
- 50,000 API calls
- 10,000 page views

**Costs:**
- Vercel: Free tier (sufficient)
- Vercel Postgres: Free tier
- **Total: $0/month**

### Example: Restaurant Chain (5 locations)

**Monthly Usage:**
- 15,000 reservations
- 5,000 waitlist entries
- 500,000 API calls
- 100,000 page views

**Costs:**
- Vercel Pro: $20/month
- Vercel Postgres Pro: $20/month
- **Total: $40/month**

---

## Support & Resources

### Official Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Python Runtime](https://vercel.com/docs/functions/serverless-functions/runtimes/python)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

### Occupie Resources

- [README.md](./README.md) - Local development setup
- [DEMO_RESOURCES.md](./DEMO_RESOURCES.md) - Demo data and presentation
- [API_REFERENCE.md](./docs/API_REFERENCE.md) - API documentation

### Community

- GitHub Issues: Report bugs or request features
- Vercel Community: [vercel.com/community](https://vercel.com/community)

---

## Migration from Other Platforms

### From Heroku

1. Export Heroku Postgres data:
   ```bash
   heroku pg:backups:download
   ```

2. Import to Vercel Postgres:
   ```bash
   psql $VERCEL_DATABASE_URL < latest.dump
   ```

3. Update environment variables in Vercel

### From Railway

1. Export database
2. Import to Vercel Postgres
3. Update `DATABASE_URL` in Vercel

### From Local

1. Export SQLite to PostgreSQL:
   ```bash
   # Using pgloader or manual export
   ```

2. Upload schema and data to Vercel Postgres

---

## Troubleshooting Commands

```bash
# Check deployment status
vercel inspect <deployment-url>

# View function logs
vercel logs <deployment-url>

# Test locally before deploying
vercel dev

# Rollback to previous deployment
vercel rollback

# Download environment variables
vercel env pull
```

---

## Next Steps After Deployment

1. ✅ **Test all workflows** - Customer, Host, Manager, Floor Staff
2. ✅ **Seed demo data** - Use `seed_demo_data.py` adapted for production
3. ✅ **Create staff accounts** - Provision manager, host, floor staff
4. ✅ **Configure restaurant** - Set name, table layout, business rules
5. ✅ **Test authentication** - Register, login, logout flows
6. ✅ **Test reservations** - Create, confirm, cancel, seat
7. ✅ **Test waitlist** - Add, queue, seat from waitlist
8. ✅ **Monitor performance** - Check function execution times
9. ✅ **Set up monitoring** - Use Vercel Analytics (optional)
10. ✅ **Plan backups** - Schedule regular database exports

---

**Deployment Complete!** 🚀

Your Occupie instance is now live at: `https://your-app.vercel.app`

**Last Updated:** October 10, 2026  
**Version:** 1.0  
**For support, see:** [GitHub Issues](https://github.com/yourusername/occupie/issues)
