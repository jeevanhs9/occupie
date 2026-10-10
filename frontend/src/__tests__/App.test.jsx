import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RoleProvider } from '../hooks/useRole';
import LandingPage from '../pages/landing/LandingPage';
import RoleSelectPage from '../pages/auth/RoleSelectPage';
import LoginPage from '../pages/auth/LoginPage';
import ManagerDashboard from '../pages/dashboards/manager/ManagerDashboard';

describe('Occupie Frontend Phase 1 Foundation', () => {
  it('renders landing page headline and tagline', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/']}>
        <RoleProvider>
          <LandingPage />
        </RoleProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Smarter Table Allocation/i)).toBeInTheDocument();
    expect(screen.getByText(/Shorter Waits/i)).toBeInTheDocument();
    expect(screen.getByText(/Happier Dining/i)).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders role selector with 4 core user roles', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/auth/demo-roles']}>
        <RoleProvider>
          <RoleSelectPage />
        </RoleProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Role Sandbox & UI Preview/i)).toBeInTheDocument();
    expect(screen.getByText('Restaurant Manager')).toBeInTheDocument();
    expect(screen.getByText('Receptionist / Host')).toBeInTheDocument();
    expect(screen.getByText('Floor Staff')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });

  it('renders login screen with form inputs', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/auth/login']}>
        <RoleProvider>
          <LoginPage />
        </RoleProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Sign in to Occupie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Work or Personal Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
  });

  it('renders manager dashboard with metric cards and tables', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/dashboard/manager']}>
        <RoleProvider>
          <ManagerDashboard />
        </RoleProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Restaurant Operations Hub')).toBeInTheDocument();
    expect(screen.getByText('Occupancy Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Active Table Units')).toBeInTheDocument();
  });
});
