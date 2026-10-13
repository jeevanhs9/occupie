# Occupie Vercel Architecture

Visual guide to how Occupie is deployed on Vercel.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL PLATFORM                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Global CDN   │    │  Serverless   │    │   Vercel      │
│  (Frontend)   │    │  Functions    │    │   Postgres    │
│               │    │  (Backend)    │    │               │
│  React + Vite │    │  Flask + SQL  │    │  PostgreSQL   │
│  Static Files │    │  Python 3.13  │    │  Database     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        │                     └──────────┬──────────┘
        │                                │
        │                          ┌────▼────┐
        │                          │  Data   │
        │                          │ Storage │
        │                          └─────────┘
        │
┌───────▼───────────────────────────────────────────────────┐
│                     USER'S BROWSER                        │
│  https://your-app.vercel.app                              │
└───────────────────────────────────────────────────────────┘
```

---

## Request Flow

### 1. Static Asset Request (HTML, CSS, JS, Images)

```
User Browser
    │
    │ GET / or /dashboard/manager
    │
    ▼
Vercel Edge Network (Global CDN)
    │
    │ Cache check
    │
    ▼
Serve static file from frontend/dist/
    │
    ▼
Return to Browser
```

**Performance:**
- Edge-cached worldwide
- ~50-100ms response time
- No serverless invocation needed

---

### 2. API Request (Data Operations)

```
User Browser
    │
    │ POST /api/auth/login
    │ GET /api/v1/reservations
    │
    ▼
Vercel Routing Layer
    │
    │ Match route: /api/*
    │
    ▼
Serverless Function (backend/api/index.py)
    │
    │ Initialize Flask app
    │
    ▼
Flask Application
    │
    ├─ Authentication
    ├─ Authorization
    ├─ Business Logic
    │
    ▼
SQLAlchemy ORM
    │
    ▼
Vercel Postgres Database
    │
    │ Execute SQL query
    │
    ▼
Return JSON response through chain
    │
    ▼
User Browser
```

**Performance:**
- Cold start: ~500-800ms (first request)
- Warm: ~100-300ms (subsequent requests)
- Database query: ~20-100ms

---

## File Structure on Vercel

### After Build

```
E:\Occupie\                    Vercel Deployment
├── frontend/
│   ├── dist/                  → Served from CDN
│   │   ├── index.html         → Entry point
│   │   └── assets/
│   │       ├── index.css      → Optimized CSS
│   │       └── index.js       → Bundled JS
│   └── package.json
├── backend/
│   ├── api/
│   │   └── index.py           → Serverless entry point
│   ├── app/
│   │   ├── __init__.py        → Flask app factory
│   │   ├── models/            → Deployed with function
│   │   ├── routes/            → Deployed with function
│   │   └── services/          → Deployed with function
│   └── requirements.txt       → Python dependencies
└── vercel.json                → Deployment config
```

---

## Environment Separation

### Development (Local)

```
┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │
│              │         │              │
│ localhost:   │ ◄─────► │ localhost:   │
│    5173      │  Proxy  │    5000      │
│              │         │              │
│ Vite Dev     │         │ Flask Dev    │
└──────────────┘         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │   SQLite     │
                         │  Dev DB      │
                         └──────────────┘
```

### Production (Vercel)

```
┌────────────────────────────────────────────┐
│        Vercel Global Infrastructure        │
│                                            │
│  ┌─────────────┐      ┌────────────────┐  │
│  │  CDN Edge   │      │   Serverless   │  │
│  │  Frontend   │◄────►│   Functions    │  │
│  │             │ API  │   (Backend)    │  │
│  └─────────────┘      └────────┬───────┘  │
│                                │          │
│                         ┌──────▼───────┐  │
│                         │   Vercel     │  │
│                         │  Postgres    │  │
│                         └──────────────┘  │
└────────────────────────────────────────────┘
```

---

## Data Flow

### Customer Creates Reservation

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. User fills form in browser                          │
│     ├─ Date, time, party size                           │
│     ├─ Contact info, preferences                        │
│     └─ Clicks "Book Table"                              │
│                                                         │
└───────────────┬─────────────────────────────────────────┘
                │
                │ POST /api/v1/reservations
                │ { partySize: 4, startsAt: "2026-10-15T19:00:00Z" }
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  2. Vercel routes to backend serverless function        │
│                                                         │
│     backend/api/index.py                                │
│     └─ Imports Flask app                                │
│                                                         │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  3. Flask processes request                             │
│                                                         │
│     app/routes/reservations.py                          │
│     ├─ Validate JWT token (auth check)                  │
│     ├─ Validate party size, time                        │
│     └─ Call reservation service                         │
│                                                         │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  4. Business logic executes                             │
│                                                         │
│     app/services/allocation.py                          │
│     ├─ Find available tables                            │
│     ├─ Score table suitability                          │
│     ├─ Recommend best table                             │
│     └─ Create reservation record                        │
│                                                         │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  5. Database transaction                                │
│                                                         │
│     Vercel Postgres                                     │
│     ├─ INSERT INTO reservations (...)                   │
│     ├─ INSERT INTO audit_events (...)                   │
│     └─ COMMIT                                           │
│                                                         │
└───────────────┬─────────────────────────────────────────┘
                │
                │ Response: { id: 123, status: "confirmed", ... }
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  6. Return to browser                                   │
│                                                         │
│     Frontend receives JSON                              │
│     ├─ Update UI with confirmation                      │
│     ├─ Show reservation details                         │
│     └─ Enable cancellation option                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Total Time:** ~500-800ms (end-to-end)

---

## Scaling Behavior

### Low Traffic (0-100 requests/minute)

```
Serverless Functions: 1-2 instances
Database Connections: 1-2 active
Response Time: <300ms average
```

### Medium Traffic (100-1,000 requests/minute)

```
Serverless Functions: Auto-scale 5-10 instances
Database Connections: Pool of 5-10
Response Time: <500ms average
```

### High Traffic (1,000+ requests/minute)

```
Serverless Functions: Auto-scale 20-50 instances
Database Connections: Pool with PgBouncer
Response Time: <800ms average
```

**Vercel handles scaling automatically** - no configuration needed.

---

## Cold Start vs Warm Start

### Cold Start (First Request After Idle)

```
Request arrives
    │
    ▼
Vercel provisions new instance
    │ (300-500ms)
    ▼
Load Python runtime
    │ (100-200ms)
    ▼
Import Flask + dependencies
    │ (100-200ms)
    ▼
Initialize database connection
    │ (50-100ms)
    ▼
Execute request
    │ (50-200ms)
    ▼
Return response

Total: ~600-1200ms
```

### Warm Start (Subsequent Requests)

```
Request arrives
    │
    ▼
Use existing instance
    │ (0ms)
    ▼
Execute request
    │ (50-200ms)
    ▼
Return response

Total: ~50-200ms
```

**Mitigation:**
- Keep functions warm with periodic health checks
- Upgrade to Vercel Pro for faster cold starts
- Minimize dependencies

---

## Database Connection Pooling

```
┌────────────────────────────────────────────────┐
│          Serverless Functions                  │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Instance │  │ Instance │  │ Instance │    │
│  │    1     │  │    2     │  │    3     │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │           │
└───────┼─────────────┼─────────────┼───────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
            ┌─────────▼─────────┐
            │   Connection      │
            │      Pool         │
            │   (max 5-10)      │
            └─────────┬─────────┘
                      │
            ┌─────────▼─────────┐
            │   Vercel Postgres │
            │   (max 100 conn)  │
            └───────────────────┘
```

**Configuration:**
```python
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 5,        # Max connections per instance
    'pool_recycle': 300,   # Recycle after 5 minutes
    'pool_pre_ping': True, # Validate before using
}
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Vercel Edge (Automatic)                   │
│  ├─ DDoS protection                                 │
│  ├─ SSL/TLS encryption (HTTPS)                      │
│  ├─ Rate limiting (IP-based)                        │
│  └─ Firewall rules                                  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│  Layer 2: Application (Flask Middleware)            │
│  ├─ CORS validation                                 │
│  ├─ JWT authentication                              │
│  ├─ CSRF protection                                 │
│  └─ Request rate limiting (account-based)           │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│  Layer 3: Authorization (Flask decorators)          │
│  ├─ Role-based access control                       │
│  ├─ Resource ownership validation                   │
│  └─ Restaurant scoping                              │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│  Layer 4: Data (SQLAlchemy ORM)                     │
│  ├─ Parameterized queries (SQL injection prevent)   │
│  ├─ Input validation                                │
│  └─ Database-level constraints                      │
└─────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Vercel Dashboard Metrics

```
┌────────────────────────────────────────┐
│  Deployment Analytics                  │
│  ├─ Build duration                     │
│  ├─ Build success rate                 │
│  └─ Deployment frequency               │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Function Analytics                    │
│  ├─ Invocation count                   │
│  ├─ Error rate                         │
│  ├─ Duration (p50, p95, p99)           │
│  ├─ Cold start frequency               │
│  └─ Memory usage                       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Edge Network Analytics                │
│  ├─ Bandwidth usage                    │
│  ├─ Request count by region            │
│  ├─ Cache hit ratio                    │
│  └─ Error responses (4xx, 5xx)         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Database Analytics (Vercel Postgres)  │
│  ├─ Active connections                 │
│  ├─ Query count                        │
│  ├─ Slow queries                       │
│  └─ Storage usage                      │
└────────────────────────────────────────┘
```

---

## Cost Breakdown

### Free Tier (Hobby)

```
┌────────────────────────────────────────┐
│  Bandwidth:           100 GB/month     │
│  Function Executions: 100 hours/month  │
│  Function Invocations:6,000/day        │
│  Build Time:          6,000 min/month  │
│  Postgres:            256 MB, 60 hrs   │
│                                        │
│  Perfect for:                          │
│  ├─ 1-2 restaurants                    │
│  ├─ ~1,000 reservations/month          │
│  └─ ~100 daily active users            │
└────────────────────────────────────────┘
```

### Pro Tier ($20/month)

```
┌────────────────────────────────────────┐
│  Bandwidth:           ∞ (unlimited)    │
│  Function Executions: 1,000 hours/mo   │
│  Function Invocations:100,000/day      │
│  Build Time:          unlimited        │
│  Postgres (add $20):  1 GB, 100 hrs    │
│                                        │
│  Perfect for:                          │
│  ├─ 3-10 restaurants                   │
│  ├─ ~10,000 reservations/month         │
│  └─ ~1,000 daily active users          │
└────────────────────────────────────────┘
```

---

## Disaster Recovery

### Automatic Backups

```
Vercel Postgres (Pro+)
    │
    ├─ Daily automatic backups (7 days retention)
    ├─ Point-in-time recovery (7 days)
    └─ Manual snapshot capability
```

### Deployment History

```
Vercel keeps all deployments
    │
    ├─ Instant rollback to any previous version
    ├─ Deployment artifacts preserved
    └─ Environment variable history
```

### Manual Backup

```bash
# Export database
pg_dump $POSTGRES_URL > backup.sql

# Restore from backup
psql $POSTGRES_URL < backup.sql
```

---

## Performance Optimization Tips

### 1. Frontend Optimization
- ✅ **Already implemented:** Code splitting, lazy loading
- ✅ **Already implemented:** Asset optimization (316 KB bundle)
- 🔄 **Can add:** Service worker for offline support
- 🔄 **Can add:** Image optimization with `next/image`-like component

### 2. Backend Optimization
- ✅ **Already implemented:** Connection pooling
- 🔄 **Can add:** Redis caching layer (Vercel KV)
- 🔄 **Can add:** Query result caching
- 🔄 **Can add:** Background jobs (Vercel Cron)

### 3. Database Optimization
- ✅ **Already implemented:** Indexes on foreign keys
- 🔄 **Can add:** Composite indexes for common queries
- 🔄 **Can add:** Materialized views for reports
- 🔄 **Can add:** PgBouncer for connection pooling

---

**For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](../VERCEL_DEPLOYMENT.md)**
