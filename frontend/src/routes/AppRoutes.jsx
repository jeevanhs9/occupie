import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import { ROLE_CONFIGS } from '../lib/constants';
import LandingPage from '../pages/landing/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RoleSelectPage from '../pages/auth/RoleSelectPage';
import AuthActionPage from '../pages/auth/AuthActionPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import ManagerDashboard from '../pages/dashboards/manager/ManagerDashboard';
import HostDashboard from '../pages/dashboards/host/HostDashboard';
import FloorStaffDashboard from '../pages/dashboards/floor-staff/FloorStaffDashboard';
import CustomerDashboard from '../pages/dashboards/customer/CustomerDashboard';

function DashboardAccess({ role, children }) {
  const { loading, isAuthenticated, isDemoMode, currentRole } = useRole();
  if (loading) return <div className="min-h-screen bg-stone-950 p-8 text-stone-200">Restoring your secure session…</div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!isDemoMode && currentRole !== role) return <Navigate to={ROLE_CONFIGS[currentRole]?.route || '/dashboard/customer'} replace />;
  return children;
}

function DemoOnly({ children }) {
  const { isDemoMode } = useRole();
  return isDemoMode ? children : <Navigate to="/auth/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing & Marketing */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication & Role Sandbox */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<AuthActionPage />} />
      <Route path="/auth/verify" element={<AuthActionPage />} />
      <Route path="/auth/forgot-password" element={<AuthActionPage />} />
      <Route path="/auth/reset-password" element={<AuthActionPage />} />
      <Route path="/auth/demo-roles" element={<DemoOnly><RoleSelectPage /></DemoOnly>} />

      {/* Role-Specific Dashboards under shared DashboardLayout */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard/manager" replace />} />
        <Route path="manager" element={<DashboardAccess role="manager"><ManagerDashboard /></DashboardAccess>} />
        <Route path="host" element={<DashboardAccess role="host"><HostDashboard /></DashboardAccess>} />
        <Route path="floor-staff" element={<DashboardAccess role="floor_staff"><FloorStaffDashboard /></DashboardAccess>} />
        <Route path="customer" element={<DashboardAccess role="customer"><CustomerDashboard /></DashboardAccess>} />
        <Route path="customer/book" element={<DashboardAccess role="customer"><CustomerDashboard page="booking" /></DashboardAccess>} />
        <Route path="customer/upcoming" element={<DashboardAccess role="customer"><CustomerDashboard page="upcoming" /></DashboardAccess>} />
        <Route path="customer/history" element={<DashboardAccess role="customer"><CustomerDashboard page="history" /></DashboardAccess>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
