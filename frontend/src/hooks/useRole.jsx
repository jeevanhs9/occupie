import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES, ROLE_CONFIGS } from '../lib/constants';

const RoleContext = createContext(null);

const DEMO_USERS = {
  [ROLES.MANAGER]: { name: 'Elena Vance', email: 'manager@occupie.local', role: ROLES.MANAGER, title: 'General Operations Manager' },
  [ROLES.HOST]: { name: 'Julian Mercer', email: 'host@occupie.local', role: ROLES.HOST, title: 'Lead Maître D’ & Receptionist' },
  [ROLES.FLOOR_STAFF]: { name: 'Marco Rodriguez', email: 'staff@occupie.local', role: ROLES.FLOOR_STAFF, title: 'Floor Captain - Station A' },
  [ROLES.CUSTOMER]: { name: 'Dr. Michael Chen', email: 'guest@occupie.local', role: ROLES.CUSTOMER, title: 'Valued Dining Guest' },
};

export function RoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('occupie_demo_role') || ROLES.MANAGER;
  });

  const [user, setUser] = useState(DEMO_USERS[currentRole] || DEMO_USERS[ROLES.MANAGER]);

  useEffect(() => {
    localStorage.setItem('occupie_demo_role', currentRole);
    setUser(DEMO_USERS[currentRole] || DEMO_USERS[ROLES.MANAGER]);
  }, [currentRole]);

  const switchRole = (newRole) => {
    if (ROLE_CONFIGS[newRole]) {
      setCurrentRole(newRole);
    }
  };

  const loginAsRole = (role) => {
    switchRole(role);
  };

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        user,
        roleConfig: ROLE_CONFIGS[currentRole],
        switchRole,
        loginAsRole,
        isDemoMode: true,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
