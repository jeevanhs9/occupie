# Occupie Application Route Directory

**Last Updated**: October 10, 2026  
**Status**: All routes functional and accessible via sidebar navigation

## Public Routes

### Marketing & Authentication

| Route | Component | Description | Sidebar Link |
|-------|-----------|-------------|--------------|
| `/` | LandingPage | Public marketing homepage | ✅ "About Occupie" (from dashboards) |
| `/auth/login` | LoginPage | User authentication | ❌ Not in sidebar |
| `/auth/register` | AuthActionPage | User registration (placeholder) | ❌ Not in sidebar |
| `/auth/demo-roles` | RoleSelectPage | Demo mode role switcher | ❌ Demo mode only |

## Protected Dashboard Routes

All dashboard routes require authentication and are wrapped in `DashboardLayout` with persistent sidebar.

### Manager Dashboard (`role: manager`)

| Route | Section ID | Sidebar Label | Icon |
|-------|-----------|---------------|------|
| `/dashboard/manager` | - | Manager Dashboard | LayoutDashboard |
| `/dashboard/manager#tables` | `tables` | Table and Section Setup | Grid |
| `/dashboard/manager#reservations` | `reservations` | Reservations Overview | Calendar |
| `/dashboard/manager#analytics` | `analytics` | Analytics | BarChart3 |
| `/dashboard/manager#shift-report` | `shift-report` | Shift Reports | FileSpreadsheet |

**Navigation Pattern**: Single-page dashboard with hash anchor scrolling  
**Access Control**: `role === 'manager'` required

### Host Dashboard (`role: host`)

| Route | Section ID | Sidebar Label | Icon |
|-------|-----------|---------------|------|
| `/dashboard/host` | - | Host Dashboard | CalendarCheck |
| `/dashboard/host#reservations` | `reservations` | Reservations | Clock |
| `/dashboard/host#walk-in-queue` | `walk-in-queue` | Walk-in Queue | Users |
| `/dashboard/host#waitlist` | `waitlist` | Waitlist | ListOrdered |
| `/dashboard/host#availability` | `availability` | Table Availability | LayoutGrid |
| `/dashboard/host#seating-recommendations` | `seating-recommendations` | Seating Recommendations | Sparkles |

**Navigation Pattern**: Single-page dashboard with hash anchor scrolling  
**Access Control**: `role === 'host'` required

### Floor Staff Dashboard (`role: floor_staff`)

| Route | Section ID | Sidebar Label | Icon |
|-------|-----------|---------------|------|
| `/dashboard/floor-staff` | - | Floor Staff Dashboard | Activity |
| `/dashboard/floor-staff#assigned-tables` | `assigned-tables` | Assigned Tables | Armchair |
| `/dashboard/floor-staff#table-status` | `table-status` | Table Status | CheckCircle |
| `/dashboard/floor-staff#service-updates` | `service-updates` | Service Updates | Activity |

**Navigation Pattern**: Single-page dashboard with hash anchor scrolling  
**Access Control**: `role === 'floor_staff'` required

### Customer Dashboard (`role: customer`)

| Route | Page Prop | Sidebar Label | Icon |
|-------|-----------|---------------|------|
| `/dashboard/customer` | `hub` | My Dining Hub | Utensils |
| `/dashboard/customer/book` | `booking` | Book a Table | PlusCircle |
| `/dashboard/customer/upcoming` | `upcoming` | Upcoming Bookings | Ticket |
| `/dashboard/customer/history` | `history` | Dining History | History |

**Navigation Pattern**: Multi-page with dedicated routes (CustomerDashboard accepts `page` prop)  
**Access Control**: `role === 'customer'` required

## Route Architecture

### DashboardLayout Wrapper

All `/dashboard/*` routes are wrapped in `DashboardLayout` which provides:
- Persistent sidebar navigation
- Topbar with mobile menu toggle
- Role switcher banner (demo mode)
- Hash anchor scroll handling
- Mobile responsive layout

### Access Control

Protected routes use `DashboardAccess` wrapper component:

```javascript
function DashboardAccess({ role, children }) {
  const { loading, isAuthenticated, isDemoMode, currentRole } = useRole();
  
  // Loading state
  if (loading) return <LoadingScreen />;
  
  // Authentication check
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  
  // Role-based access (skipped in demo mode)
  if (!isDemoMode && currentRole !== role) {
    return <Navigate to={ROLE_CONFIGS[currentRole]?.route} replace />;
  }
  
  return children;
}
```

### Navigation Configuration

All sidebar navigation items are defined in `frontend/src/lib/constants.js`:

```javascript
export const ROLE_NAVIGATION = {
  [ROLES.MANAGER]: [...],
  [ROLES.HOST]: [...],
  [ROLES.FLOOR_STAFF]: [...],
  [ROLES.CUSTOMER]: [...]
};
```

Each navigation item contains:
- `label`: Display text
- `path`: Route path (with optional hash anchor)
- `icon`: Lucide icon name (mapped in Sidebar.jsx)

## Icon Library

All icons sourced from **Lucide React**:

```javascript
import {
  LayoutDashboard, Grid, Calendar, Users, BarChart3,
  CalendarCheck, Clock, ListOrdered, LayoutGrid, Activity,
  Armchair, Sparkles, Utensils, PlusCircle, Ticket,
  History, FileSpreadsheet, CheckCircle2, Store
} from 'lucide-react';
```

## Responsive Behavior

### Desktop (≥1024px)
- Sidebar always visible (72 units wide)
- Main content offset by sidebar width
- Direct navigation without overlay

### Mobile (<1024px)
- Sidebar hidden by default (translate-x-full)
- Topbar shows menu button
- Sidebar slides in as overlay when opened
- Dark backdrop visible behind sidebar
- Close via backdrop click, X button, or Escape key

## Hash Anchor Scrolling

For Manager, Host, and Floor Staff dashboards that use hash anchors:

```javascript
// DashboardLayout.jsx
useEffect(() => {
  if (!location.hash) return;
  const target = document.getElementById(
    decodeURIComponent(location.hash.slice(1))
  );
  if (!target) return;
  
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  
  target.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start'
  });
}, [location.hash, location.pathname]);
```

Sections must have matching `id` attributes:
```html
<section id="tables">...</section>
<section id="reservations">...</section>
```

## Active Route Highlighting

Sidebar highlights active route by comparing:
1. Current pathname vs target pathname
2. Current hash vs target hash (if present)

```javascript
const [targetPath, targetAnchor] = item.path.split('#');
const targetHash = targetAnchor ? `#${targetAnchor}` : '';
const isItemActive = 
  location.pathname === targetPath && 
  location.hash === targetHash;
```

Active styles:
```css
bg-occupie-burgundy-800 text-white font-semibold 
shadow-sm border border-occupie-brass-500/30
```

## Demo Mode

In demo mode (`isDemoMode === true`):
- Users can switch between roles without re-authenticating
- Access control is relaxed (can view any role dashboard)
- RoleSwitcherBanner appears at top with role selection
- Logout button changes to "Switch preview role" link

## Future Route Additions

Potential routes for future features:

### Manager
- `/dashboard/manager/staff` - Staff management
- `/dashboard/manager/settings` - Restaurant settings
- `/dashboard/manager/reports/:id` - Individual report details

### Host
- `/dashboard/host/calendar` - Full calendar view
- `/dashboard/host/reservation/:id` - Reservation details

### Floor Staff
- `/dashboard/floor-staff/table/:id` - Individual table details

### Customer
- `/dashboard/customer/reservation/:id` - Reservation details with QR code
- `/dashboard/customer/favorites` - Favorite restaurants
- `/dashboard/customer/preferences` - Account settings

## Testing Routes

To verify all routes are working:

1. **Manual Navigation Test**:
   ```bash
   npm run dev
   # Visit each route in browser
   ```

2. **Sidebar Navigation Test**:
   - Log in with each role
   - Click every sidebar item
   - Verify navigation and active highlighting

3. **Access Control Test**:
   - Try accessing wrong role dashboard
   - Verify redirect to appropriate dashboard

4. **Hash Anchor Test**:
   - Click hash anchor links
   - Verify smooth scroll to section
   - Check scroll behavior with prefers-reduced-motion

5. **Mobile Test**:
   - Open responsive view (<1024px)
   - Test menu toggle
   - Test backdrop and close buttons
   - Test Escape key

## Related Documentation

- [Navigation Status Report](./NAVIGATION_STATUS.md) - Detailed implementation status
- [API Contract](./API_CONTRACT.md) - Backend API endpoints
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Setup Guide](./SETUP.md) - Development environment setup

## Support

For issues with routing or navigation:
1. Check browser console for errors
2. Verify authentication state with React DevTools
3. Check route definitions in `AppRoutes.jsx`
4. Review navigation config in `constants.js`
5. Inspect sidebar active state logic in `Sidebar.jsx`
