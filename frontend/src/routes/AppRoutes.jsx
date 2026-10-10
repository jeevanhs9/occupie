import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/landing/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RoleSelectPage from '../pages/auth/RoleSelectPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import ManagerDashboard from '../pages/dashboards/manager/ManagerDashboard';
import HostDashboard from '../pages/dashboards/host/HostDashboard';
import FloorStaffDashboard from '../pages/dashboards/floor-staff/FloorStaffDashboard';
import CustomerDashboard from '../pages/dashboards/customer/CustomerDashboard';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing & Marketing */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication & Role Sandbox */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/demo-roles" element={<RoleSelectPage />} />

      {/* Role-Specific Dashboards under shared DashboardLayout */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard/manager" replace />} />
        <Route path="manager" element={<ManagerDashboard />} />
        <Route path="host" element={<HostDashboard />} />
        <Route path="floor-staff" element={<FloorStaffDashboard />} />
        <Route path="customer" element={<CustomerDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
