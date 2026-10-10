import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ operational: null }));

vi.mock('../hooks/useOperationalData', () => ({ useOperationalData: () => mocks.operational }));
vi.mock('../hooks/useRole', () => ({ useRole: () => ({ user: { name: 'Jordan Guest' } }) }));

import { CustomerDashboard } from '../pages/dashboards/customer/CustomerDashboard';

function renderBooking() {
  return render(<MemoryRouter><CustomerDashboard page="booking" /></MemoryRouter>);
}

function baseOperations(overrides = {}) {
  return {
    reservations: [],
    waitlist: [],
    loading: false,
    error: null,
    demoMode: false,
    refresh: vi.fn(),
    refreshWaitlist: vi.fn(),
    recommendReservation: vi.fn(),
    createReservation: vi.fn(),
    createWaitlistEntry: vi.fn(),
    updateWaitlistStatus: vi.fn(),
    updateReservationStatus: vi.fn(),
    ...overrides,
  };
}

afterEach(() => cleanup());

beforeEach(() => {
  mocks.operational = baseOperations();
});

describe('customer API booking recovery', () => {
  it('shows a structured no-match and offers the real waitlist action', async () => {
    mocks.operational.recommendReservation.mockResolvedValue({
      success: false,
      error: 'No table can seat a party of 8; the largest table seats 6.',
      reasonCode: 'party_exceeds_capacity',
      nextActions: { changePartySize: true, changeDateTime: true, joinWaitlist: false },
      alternatives: [],
    });
    renderBooking();
    fireEvent.click(screen.getByRole('button', { name: 'Find a Table' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/largest table seats 6/);
    expect(screen.queryByRole('button', { name: 'Join walk-in waitlist' })).not.toBeInTheDocument();
    expect(mocks.operational.createWaitlistEntry).not.toHaveBeenCalled();
  });

  it('confirms a persisted reservation with its reference', async () => {
    mocks.operational.recommendReservation.mockResolvedValue({
      success: true,
      data: {
        recommendation: { id: 'T01', name: 'Table 1', capacity: 2, section: 'Main Dining' },
        reason: 'Best match: table fits the party.',
        alternatives: [],
      },
    });
    mocks.operational.createReservation.mockResolvedValue({
      success: true,
      data: { reservation: { id: 'RES-ABC123', table: 'T01', startsAt: new Date(Date.now() + 3600_000).toISOString() } },
    });
    renderBooking();
    fireEvent.click(screen.getByRole('button', { name: 'Find a Table' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Table 1' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Reference: RES-ABC123/);
    expect(mocks.operational.createReservation).toHaveBeenCalledWith(expect.objectContaining({ tableId: 'T01' }));
  });

  it('offers a fresh search and waitlist after confirmation loses a race', async () => {
    mocks.operational.recommendReservation.mockResolvedValue({
      success: true,
      data: { recommendation: { id: 'T01', name: 'Table 1', capacity: 2 }, alternatives: [] },
    });
    mocks.operational.createReservation.mockResolvedValue({ success: false, status: 409, error: 'The suggested table is no longer available.' });
    mocks.operational.createWaitlistEntry.mockResolvedValue({ success: true, data: { waitlistEntry: { id: 'WL-1' } } });
    renderBooking();
    fireEvent.click(screen.getByRole('button', { name: 'Find a Table' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Table 1' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/);
    expect(screen.getByRole('button', { name: 'Find a Table' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Join walk-in waitlist' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/joined the walk-in waitlist/);
    expect(mocks.operational.createWaitlistEntry).toHaveBeenCalled();
  });

  it('does not show an empty reservation state after an API failure', () => {
    mocks.operational = baseOperations({ error: 'API offline' });
    render(<MemoryRouter><CustomerDashboard page="upcoming" /></MemoryRouter>);
    expect(screen.getByText(/Reservations could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByText('No upcoming reservations')).not.toBeInTheDocument();
  });
});
