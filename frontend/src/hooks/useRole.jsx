import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ROLES, ROLE_CONFIGS } from '../lib/constants';
import { apiService, DATA_MODE } from '../services/api';

const RoleContext = createContext(null);
const DEMO_USERS = {
  [ROLES.MANAGER]: { name: 'Demo Manager', email: 'manager@occupie.local', role: ROLES.MANAGER, title: 'General Operations Manager' },
  [ROLES.HOST]: { name: 'Demo Host', email: 'host@occupie.local', role: ROLES.HOST, title: 'Lead Host' },
  [ROLES.FLOOR_STAFF]: { name: 'Demo Floor Staff', email: 'staff@occupie.local', role: ROLES.FLOOR_STAFF, title: 'Floor Staff' },
  [ROLES.CUSTOMER]: { name: 'Demo Customer', email: 'guest@occupie.local', role: ROLES.CUSTOMER, title: 'Dining Guest' },
};

const isDemoMode = DATA_MODE === 'demo';

export function RoleProvider({ children }) {
  const [demoRole, setDemoRole] = useState(() => isDemoMode
    ? (localStorage.getItem('occupie_demo_role') || ROLES.CUSTOMER)
    : ROLES.CUSTOMER);
  const [user, setUser] = useState(() => isDemoMode ? (DEMO_USERS[demoRole] || DEMO_USERS[ROLES.CUSTOMER]) : null);
  const [loading, setLoading] = useState(!isDemoMode);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('occupie_demo_role', demoRole);
      setUser(DEMO_USERS[demoRole] || DEMO_USERS[ROLES.CUSTOMER]);
      return undefined;
    }
    localStorage.removeItem('occupie_demo_role');
    let active = true;
    apiService.auth.restore().then((result) => {
      if (!active) return;
      setUser(result.success ? result.data.user : null);
      setAuthError(result.success ? null : result.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, [demoRole]);

  const switchRole = (nextRole) => {
    if (isDemoMode && ROLE_CONFIGS[nextRole]) setDemoRole(nextRole);
  };

  const login = async (credentials) => {
    const result = await apiService.auth.login(credentials);
    if (result.success) {
      setUser(result.data.user);
      setAuthError(null);
      setLoading(false);
    }
    return result;
  };

  const logout = async () => {
    const result = await apiService.auth.logout();
    if (result.success) {
      setUser(null);
      setAuthError(null);
    } else {
      setAuthError(result.error);
    }
    return result;
  };

  const currentRole = isDemoMode ? demoRole : (user?.role || ROLES.CUSTOMER);
  const value = useMemo(() => ({
    currentRole,
    user,
    roleConfig: ROLE_CONFIGS[currentRole] || null,
    switchRole,
    loginAsRole: switchRole,
    login,
    logout,
    loading,
    authError,
    isAuthenticated: isDemoMode || Boolean(user),
    isDemoMode,
  }), [currentRole, user, loading, authError]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}
