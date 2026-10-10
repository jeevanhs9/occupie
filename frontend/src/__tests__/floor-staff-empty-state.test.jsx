import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockUseOperationalData, mockUseRole } = vi.hoisted(() => ({
  mockUseOperationalData: vi.fn(),
  mockUseRole: vi.fn(),
}));

vi.mock('../hooks/useOperationalData', () => ({ useOperationalData: mockUseOperationalData }));
vi.mock('../hooks/useRole', () => ({ useRole: mockUseRole }));

import FloorStaffDashboard from '../pages/dashboards/floor-staff/FloorStaffDashboard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderFloorStaff(tables) {
  mockUseOperationalData.mockReturnValue({
    tables,
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateTableStatus: vi.fn(),
    demoMode: false,
  });
  mockUseRole.mockReturnValue({ user: { name: 'Sam Rivera' }, isDemoMode: false });

  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FloorStaffDashboard />
    </MemoryRouter>
  );
}

describe('floor staff table empty states', () => {
  it('offers the full floor when no tables match the signed-in staff member', () => {
    renderFloorStaff([
      { id: 'T-01', name: 'Table 1', capacity: 2, section: 'Main Dining', status: 'available', assignedServer: 'Jordan Lee' },
    ]);

    expect(screen.getByRole('heading', { name: 'No tables are assigned to your station' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View all tables' }));
    expect(screen.getByText('Table 1')).toBeInTheDocument();
  });

  it('explains when the restaurant has no configured tables', () => {
    renderFloorStaff([]);

    expect(screen.getByRole('heading', { name: 'No tables are configured yet' })).toBeInTheDocument();
    expect(screen.getByText(/Ask a manager to add restaurant tables/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View all tables' })).not.toBeInTheDocument();
  });
});
