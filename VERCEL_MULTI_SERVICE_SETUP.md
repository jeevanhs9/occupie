# Vercel Multi-Service Setup for Occupie

This document explains Occupie's Vercel **multi-service** configuration.

---

## What is Multi-Service?

Vercel's multi-service feature lets you deploy multiple applications (frontend + backend) from a single repository as separate services with independent:
- Build configurations
- Environment variables
- Scaling settings
- Deployment strategies

---

## Occupie's Service Architecture

```
┌─────────────────────────────────────────────┐
│         Root vercel.json                    │
│   Defines services and routing              │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│  Frontend   │  │  Backend    │
│  Service    │  │  Service    │
│             │  │             │
│  Vite +     │  │  Flask +    │
│  React      │  │  Python     │
└─────────────┘  └─────────────┘
```

---

## File Structure

```
E:\Occupie\
├── vercel.json                    ← Root: Service definitions + routing
│
├── frontend/
│   ├── vercel.json               ← Frontend service config
│   ├── package.json
│   ├── src/
│   └── dist/                     ← Build output (generated)
│
└── backend/
    ├── vercel.json               ← Backend service config
    ├── api/
    │   ├── index.py              ← Serverless entry point
    │   └── requirements.txt      ← Python dependencies (copy from parent)
    └── app/                      ← Flask application code
```

---

## Configuration Files Explained

### 1. Root `vercel.json` (Repository Root)

**Purpose:** Define services and route requests

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "backend",
      "framework": "flask"
    },
    "frontend": {
      "root": "frontend",
      "framework": "vite"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": {
        "service": "backend"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "frontend"
      }
    }
  ]
}
```

**Key Points:**
- `services` defines each deployable unit
- `root` specifies the subdirectory for each service
- `rewrites` route requests to appropriate service
- `/api/*` goes to backend, everything else to frontend

---

### 2. Frontend `vercel.json` (`frontend/vercel.json`)

**Purpose:** Configure Vite build for frontend service

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install"
}
```

**Key Points:**
- `buildCommand`: How to build the frontend
- `outputDirectory`: Where build artifacts are
- `framework`: Enables Vite-specific optimizations
- Vercel automatically serves from `dist/`

---

### 3. Backend `vercel.json` (`backend/vercel.json`)

**Purpose:** Configure Python serverless functions

```json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.py"
    }
  ]
}
```

**Key Points:**
- `builds`: Tells Vercel to compile `api/index.py` as Python function
- `use`: Specifies Python runtime
- `routes`: All backend requests go to `index.py`

---

### 4. Backend Entry Point (`backend/api/index.py`)

**Purpose:** Expose Flask app to Vercel's Python runtime

```python
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app

# Create Flask app instance
app = create_app()

# Vercel automatically wraps this as a serverless function
```

**Key Points:**
- Adjusts Python path to import from `backend/app/`
- Creates Flask app using factory pattern
- Vercel's Python runtime handles HTTP request/response

---

### 5. Backend Dependencies (`backend/api/requirements.txt`)

**Purpose:** Specify Python packages for serverless function

This is a **copy** of `backend/requirements.txt` placed in the `api/` directory so Vercel can find it.

```
Flask>=3.0.0
Flask-SQLAlchemy>=3.1.1
Flask-JWT-Extended>=4.5.3
psycopg2-binary>=2.9.9
# ... other dependencies
```

**Why the copy?**
- Vercel looks for `requirements.txt` in the same directory as `index.py`
- Keeps dependencies close to the entry point

---

## How Routing Works

### Example Request Flow

#### Frontend Request (e.g., `GET /dashboard/manager`)

```
User Browser
    │
    │ https://your-app.vercel.app/dashboard/manager
    │
    ▼
Vercel Edge Network
    │
    │ Check root vercel.json rewrites
    │ Pattern: /(.*) → frontend service
    │
    ▼
Frontend Service (Vite Static Files)
    │
    │ Serve dist/index.html
    │
    ▼
React Router handles client-side routing
```

#### Backend Request (e.g., `POST /api/auth/login`)

```
User Browser
    │
    │ https://your-app.vercel.app/api/auth/login
    │
    ▼
Vercel Edge Network
    │
    │ Check root vercel.json rewrites
    │ Pattern: /api/(.*) → backend service
    │
    ▼
Backend Service (Python Serverless)
    │
    │ Invoke backend/api/index.py
    │
    ▼
Flask app processes request
    │
    ▼
Return JSON response
```

---

## Deployment Process

### What Happens During Deploy

1. **Vercel reads root `vercel.json`**
   - Identifies two services: frontend + backend

2. **Builds frontend service**
   - Changes to `frontend/` directory
   - Runs `npm install`
   - Runs `npm run build`
   - Outputs to `frontend/dist/`
   - Deploys to CDN

3. **Builds backend service**
   - Changes to `backend/` directory
   - Reads `api/requirements.txt`
   - Installs Python packages
   - Compiles `api/index.py` as serverless function
   - Deploys to serverless infrastructure

4. **Sets up routing**
   - Configures edge routing per `rewrites` rules
   - `/api/*` → backend function
   - `/*` → frontend static files

---

## Environment Variables

### Service-Specific Variables

Environment variables can be scoped to specific services:

```
# Applies to both services
SECRET_KEY=abc123

# Backend-only (optional)
backend:DATABASE_URL=postgres://...

# Frontend-only (optional - baked into build)
frontend:VITE_API_URL=/api
```

**In Vercel Dashboard:**
- Go to Settings → Environment Variables
- Variables without prefix apply to all services
- Use `service:` prefix for service-specific vars

---

## Benefits of Multi-Service Architecture

### 1. Independent Builds
- Frontend changes don't rebuild backend
- Backend changes don't rebuild frontend
- Faster deployment times

### 2. Separate Scaling
- Frontend: Global CDN, infinite scale
- Backend: Function-based scaling, pay per use

### 3. Clearer Boundaries
- Frontend concerns isolated
- Backend concerns isolated
- Easier to understand and maintain

### 4. Optimized Caching
- Frontend: Cache static assets forever
- Backend: Cache responses conditionally

---

## Troubleshooting

### Issue: "Service 'backend' not found"

**Cause:** Root `vercel.json` missing or incorrect

**Fix:**
1. Verify `vercel.json` exists in repository root
2. Check `services` section defines "backend"
3. Ensure `root: "backend"` matches directory name

---

### Issue: "Cannot find module 'app'"

**Cause:** Python path not set correctly in `api/index.py`

**Fix:**
```python
# Add this at top of backend/api/index.py
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
```

---

### Issue: "requirements.txt not found"

**Cause:** Missing `requirements.txt` in `backend/api/` directory

**Fix:**
```powershell
Copy-Item backend\requirements.txt backend\api\requirements.txt
```

Or create symlink (advanced):
```powershell
New-Item -ItemType SymbolicLink -Path backend\api\requirements.txt -Target ..\requirements.txt
```

---

### Issue: Frontend shows 404 for /api calls

**Cause:** Rewrites not configured properly

**Fix:**
1. Check root `vercel.json` has:
   ```json
   "rewrites": [
     {
       "source": "/api/(.*)",
       "destination": { "service": "backend" }
     }
   ]
   ```
2. Redeploy

---

### Issue: "Build failed" for backend

**Cause:** Python dependencies missing or incompatible

**Fix:**
1. Test locally:
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```
2. Check for version conflicts
3. Review Vercel build logs for specific error

---

## Migration from Old Config

If you have old `vercel.json` format:

**Old (v2 builds):**
```json
{
  "version": 2,
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build" },
    { "src": "backend/api/index.py", "use": "@vercel/python" }
  ]
}
```

**New (multi-service):**
```json
{
  "services": {
    "frontend": { "root": "frontend", "framework": "vite" },
    "backend": { "root": "backend", "framework": "flask" }
  },
  "rewrites": [...]
}
```

**Benefits of migrating:**
- Cleaner configuration
- Better service isolation
- Faster builds
- More flexibility

---

## Testing Multi-Service Locally

Use `vercel dev` to test locally:

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd E:\Occupie
vercel link

# Start dev server
vercel dev
```

This simulates Vercel's routing locally.

---

## Best Practices

### 1. Keep Services Independent
- Frontend shouldn't import backend code
- Backend shouldn't serve frontend files
- Share code via API only

### 2. Version Dependencies
- Pin versions in `requirements.txt`
- Use lockfiles (`package-lock.json`)

### 3. Use Service-Specific Environment Variables
- Prefix with `service:` when needed
- Avoid pollution between services

### 4. Test Routing
- Verify `/api/*` goes to backend
- Verify `/*` goes to frontend
- Test edge cases (e.g., `/api` without trailing slash)

---

## Summary

Occupie's multi-service setup:
- ✅ Root `vercel.json` defines two services
- ✅ Frontend service builds Vite app
- ✅ Backend service runs Flask as serverless
- ✅ Routing handled by rewrites
- ✅ Independent scaling and deployment

**Key Files to Commit:**
- `vercel.json` (root)
- `frontend/vercel.json`
- `backend/vercel.json`
- `backend/api/index.py`
- `backend/api/requirements.txt`

---

**For complete deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)**

**Last Updated:** October 10, 2026  
**Version:** 2.0 (Multi-Service)
