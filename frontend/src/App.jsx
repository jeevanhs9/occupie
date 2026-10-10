import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { RoleProvider } from './hooks/useRole';
import AppRoutes from './routes/AppRoutes';
import { OccupieChat } from './components/common/OccupieChat';

function SitewideOccupieChat() {
  const location = useLocation();
  const dashboardPaths = [
    '/dashboard/manager',
    '/dashboard/host',
    '/dashboard/floor-staff',
    '/dashboard/customer',
  ];
  return dashboardPaths.includes(location.pathname) ? <OccupieChat /> : null;
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RoleProvider>
        <AppRoutes />
        <SitewideOccupieChat />
      </RoleProvider>
    </BrowserRouter>
  );
}

export default App;
