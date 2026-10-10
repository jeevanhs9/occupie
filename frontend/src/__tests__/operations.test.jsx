import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let RoleProvider;
let useOperationalData;
let HostDashboard;
let CustomerDashboard;
let AppRoutes;

beforeAll(async () => {
  vi.stubEnv('VITE_DATA_MODE', 'demo');
  ({ RoleProvider } = await import('../hooks/useRole'));
  ({ useOperationalData } = await import('../hooks/useOperationalData'));
  ({ HostDashboard } = await import('../pages/dashboards/host/HostDashboard'));
  ({ CustomerDashboard } = await import('../pages/dashboards/customer/CustomerDashboard'));
  ({ default: AppRoutes } = await import('../routes/AppRoutes'));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const withRole = (page) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <RoleProvider>{page}</RoleProvider>
  </MemoryRouter>
);

describe('Occupie operational preview flows', () => {
  it('changes table status after validating the party size', async () => {
    const { result } = renderHook(() => useOperationalData());
    let response;
    await act(async () => {
      response = await result.current.updateTableStatus('T03', 'occupied', 3);
    });
    expect(response.success).toBe(true);
    expect(result.current.tables.find((table) => table.id === 'T03')).toMatchObject({ status: 'occupied', partySize: 3 });
  });

  it('registers a walk-in and adds it to the visible host queue', async () => {
    render(withRole(<HostDashboard />));
    expect(screen.getByText('Preview data · resets on reload')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Walk-In' }));
    fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Rivera Party' } });
    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Queue' }));

    expect(await screen.findByText('Rivera Party')).toBeInTheDocument();
    expect(screen.getByText(/Waiting 0 min · preview/)).toBeInTheDocument();
  });

  it('seats the longest-waiting party using an available table', async () => {
    render(withRole(<HostDashboard />));
    const allocateButtons = screen.getAllByRole('button', { name: 'Allocate' });
    expect(screen.getByText(/Suggested T14 · 6 seats/)).toBeInTheDocument();
    fireEvent.click(allocateButtons[0]);
    expect(await screen.findByRole('status')).toHaveTextContent(/Seated Patel Group at T14/);
  });

  it('confirms before marking a reservation as a no-show', async () => {
    render(withRole(<HostDashboard />));
    const reservation = screen.getByText('Victoria Sterling').closest('article');
    fireEvent.click(within(reservation).getByRole('button', { name: 'No-show' }));

    const confirmation = await screen.findByRole('group', { name: 'Confirm no-show for Victoria Sterling' });
    expect(confirmation).toHaveTextContent(/Mark Victoria Sterling as a no-show/);
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm no-show' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Victoria Sterling was marked as a no-show/);
    await waitForElementToBeRemoved(() => screen.getByRole('heading', { name: 'Victoria Sterling' }));
  });

  it('confirms before removing a party from the walk-in queue', async () => {
    render(withRole(<HostDashboard />));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gomez Party from waitlist' }));

    const confirmation = await screen.findByRole('group', { name: 'Confirm waitlist removal for Gomez Party' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm removal' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Gomez Party was removed from the waitlist/);
    await waitForElementToBeRemoved(() => screen.getByRole('heading', { name: 'Gomez Party' }));
  });

  it('shows a table recommendation before confirming a customer reservation', async () => {
    render(withRole(<CustomerDashboard />));
    fireEvent.click(screen.getByRole('button', { name: 'Reserve a Table' }));
    fireEvent.click(screen.getByRole('button', { name: 'Find a Table' }));

    expect(await screen.findByText(/Suggested table:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm Table/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Reservation confirmed/);
  });

  it('renders each role dashboard through its configured route', () => {
    const roleRoutes = [
      ['/dashboard/manager', 'Restaurant Operations'],
      ['/dashboard/host', 'Host Stand & Seating Desk'],
      ['/dashboard/floor-staff', 'Floor Staff & Table Turnover'],
      ['/dashboard/customer', 'Welcome back, Demo Customer'],
    ];

    for (const [route, heading] of roleRoutes) {
      const view = render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[route]}>
          <RoleProvider><AppRoutes /></RoleProvider>
        </MemoryRouter>
      );
      expect(screen.getByText(heading)).toBeInTheDocument();
      view.unmount();
    }
  });
});
