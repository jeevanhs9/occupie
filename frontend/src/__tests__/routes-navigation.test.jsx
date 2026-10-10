import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_NAVIGATION } from '../lib/constants';

let RoleProvider;
let AppRoutes;
let Sidebar;

beforeAll(async () => {
  vi.stubEnv('VITE_DATA_MODE', 'demo');
  [
    { RoleProvider },
    { default: AppRoutes },
    { Sidebar },
  ] = await Promise.all([
    import('../hooks/useRole'),
    import('../routes/AppRoutes'),
    import('../components/layout/Sidebar'),
  ]);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

afterAll(() => vi.unstubAllEnvs());

function RouteLocation() {
  const location = useLocation();
  return <output data-testid="route-location">{location.pathname}{location.hash}</output>;
}

function HistoryBackButton() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>Back to previous page</button>;
}

const directRouteCases = [
  ['manager', '/dashboard/manager', 'Restaurant Operations'],
  ['host', '/dashboard/host', 'Host Stand & Seating Desk'],
  ['floor_staff', '/dashboard/floor-staff', 'Floor Staff & Table Turnover'],
  ['customer', '/dashboard/customer', 'Welcome back, Demo Customer'],
  ['customer', '/dashboard/customer/book', 'Book a table'],
  ['customer', '/dashboard/customer/upcoming', 'Upcoming bookings'],
  ['customer', '/dashboard/customer/history', 'Dining history'],
];

describe('registered dashboard routes', () => {
  it.each(directRouteCases)('loads %s page directly at %s', async (role, path, heading) => {
    localStorage.setItem('occupie_demo_role', role);
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
        <RoleProvider><AppRoutes /></RoleProvider>
      </MemoryRouter>
    );

    const targetHeading = role === 'customer' && path.endsWith('/history')
      ? await screen.findByRole('heading', { name: heading, level: 1 })
      : await screen.findByRole('heading', { name: heading });
    expect(targetHeading).toBeInTheDocument();
  });
});

describe('role-aware sidebar navigation', () => {
  it.each(Object.entries(ROLE_NAVIGATION))('routes and highlights every %s navigation item', (role, items) => {
    const homePath = items[0].path.split('#')[0];
    localStorage.setItem('occupie_demo_role', role);
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[homePath]}>
        <RoleProvider>
          <Sidebar />
          <RouteLocation />
        </RoleProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Occupie home' })).toHaveAttribute('href', '/');

    for (const item of items) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.path);
      fireEvent.click(link);
      expect(screen.getByTestId('route-location')).toHaveTextContent(item.path);
      expect(link).toHaveAttribute('aria-current', 'page');
      expect(screen.getAllByRole('link').filter((candidate) => candidate.hasAttribute('aria-current'))).toEqual([link]);
    }
  });

  it('returns to the previous customer page through router history', () => {
    localStorage.setItem('occupie_demo_role', 'customer');
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/dashboard/customer']}>
        <RoleProvider>
          <Sidebar />
          <HistoryBackButton />
          <RouteLocation />
        </RoleProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Book a Table' }));
    expect(screen.getByTestId('route-location')).toHaveTextContent('/dashboard/customer/book');
    fireEvent.click(screen.getByRole('button', { name: 'Back to previous page' }));
    expect(screen.getByTestId('route-location')).toHaveTextContent('/dashboard/customer');
    expect(screen.getByRole('link', { name: 'My Dining Hub' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('protected route redirects', () => {
  it('redirects direct URLs to the workspace associated with the authenticated role', async () => {
    cleanup();
    vi.resetModules();
    globalThis.__occupieRouteTestAuth = {
      loading: false,
      isAuthenticated: true,
      isDemoMode: false,
      currentRole: 'customer',
    };
    vi.doMock('../hooks/useRole', () => ({ useRole: () => globalThis.__occupieRouteTestAuth }));
    vi.doMock('../components/layout/DashboardLayout', () => ({
      default: () => <Outlet />,
    }));
    vi.doMock('../pages/dashboards/manager/ManagerDashboard', () => ({ default: () => <div>Manager workspace</div> }));
    vi.doMock('../pages/dashboards/host/HostDashboard', () => ({ default: () => <div>Host workspace</div> }));
    vi.doMock('../pages/dashboards/floor-staff/FloorStaffDashboard', () => ({ default: () => <div>Floor staff workspace</div> }));
    vi.doMock('../pages/dashboards/customer/CustomerDashboard', () => ({ default: () => <div>Customer workspace</div> }));

    const { default: ProtectedAppRoutes } = await import('../routes/AppRoutes');
    const cases = [
      ['customer', '/dashboard/manager', '/dashboard/customer', 'Customer workspace'],
      ['host', '/dashboard/floor-staff', '/dashboard/host', 'Host workspace'],
      ['manager', '/dashboard/customer', '/dashboard/manager', 'Manager workspace'],
      ['floor_staff', '/dashboard/host', '/dashboard/floor-staff', 'Floor staff workspace'],
    ];

    for (const [role, requestedPath, expectedPath, workspace] of cases) {
      globalThis.__occupieRouteTestAuth.currentRole = role;
      const view = render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[requestedPath]}>
          <><ProtectedAppRoutes /><RouteLocation /></>
        </MemoryRouter>
      );
      expect(await screen.findByText(workspace)).toBeInTheDocument();
      expect(screen.getByTestId('route-location')).toHaveTextContent(expectedPath);
      view.unmount();
    }
  });
});
