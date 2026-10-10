import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoleProvider } from '../hooks/useRole';
import { useOperationalData } from '../hooks/useOperationalData';
import { HostDashboard } from '../pages/dashboards/host/HostDashboard';
import { FloorStaffDashboard } from '../pages/dashboards/floor-staff/FloorStaffDashboard';
import { CustomerDashboard } from '../pages/dashboards/customer/CustomerDashboard';
import AppRoutes from '../routes/AppRoutes';

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
    fireEvent.click(screen.getByRole('button', { name: 'Add Walk-In' }));
    fireEvent.change(screen.getByLabelText('Party name'), { target: { value: 'Rivera Party' } });
    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Queue' }));

    expect(await screen.findByText('Rivera Party')).toBeInTheDocument();
    expect(screen.getByText(/No wait estimate/)).toBeInTheDocument();
  });

  it('seats the longest-waiting party using an available table', async () => {
    render(withRole(<HostDashboard />));
    const allocateButtons = screen.getAllByRole('button', { name: 'Allocate' });
    fireEvent.click(allocateButtons[0]);
    expect(await screen.findByRole('status')).toHaveTextContent(/Seated Patel Group at T14/);
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
      ['/dashboard/manager', 'Restaurant Operations Hub'],
      ['/dashboard/host', 'Host Stand & Seating Desk'],
      ['/dashboard/floor-staff', 'Floor Staff & Table Turnover'],
      ['/dashboard/customer', 'Welcome back, Elena Vance'],
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
