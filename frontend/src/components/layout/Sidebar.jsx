import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { ROLE_NAVIGATION, ROLE_CONFIGS } from '../../lib/constants';
import Logo from '../common/Logo';
import {
  LayoutDashboard,
  Grid,
  Calendar,
  Users,
  BarChart3,
  Settings,
  CalendarCheck,
  Clock,
  ListOrdered,
  LayoutGrid,
  Activity,
  Armchair,
  Sparkles,
  Utensils,
  PlusCircle,
  Ticket,
  History,
  FileSpreadsheet,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Store,
  X,
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard,
  Grid,
  Calendar,
  Users,
  BarChart3,
  Settings,
  CalendarCheck,
  Clock,
  ListOrdered,
  LayoutGrid,
  Activity,
  Armchair,
  Sparkles,
  Utensils,
  PlusCircle,
  Ticket,
  History,
  FileSpreadsheet,
  CheckCircle: CheckCircle2,
};

export function Sidebar({ isOpen, onClose }) {
  const { currentRole, user, roleConfig, logout, isDemoMode } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const navItems = ROLE_NAVIGATION[currentRole] || [];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="sidebar-scrim fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="dashboard-navigation"
        aria-label={`${roleConfig?.title || 'Occupie'} navigation`}
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-occupie-walnut-900 text-slate-200 border-r border-occupie-walnut-800 flex flex-col transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0 visible' : '-translate-x-full invisible lg:visible lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-occupie-navy-800 flex items-center justify-between">
          <Logo theme="light" size="md" />
          <button
            type="button"
            className="sidebar-close lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {/* Current Active Location Pill */}
        <div className="px-6 py-3 bg-occupie-navy-950/60 border-b border-occupie-navy-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Store className="w-3.5 h-3.5 text-occupie-teal-400 shrink-0" />
            <span className="font-medium truncate">L’Atelier Bistro & Bar</span>
            <span className="ml-auto text-[10px] uppercase font-bold text-occupie-teal-400 bg-occupie-teal-950/60 px-1.5 py-0.5 rounded border border-occupie-teal-800/50">
              Station 1
            </span>
          </div>
        </div>

        {/* Role Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1" aria-label="Dashboard sections">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {roleConfig?.badge || 'Navigation'}
          </div>

          {navItems.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard;
            const [targetPath, targetAnchor] = item.path.split('#');
            const targetHash = targetAnchor ? `#${targetAnchor}` : '';
            const isItemActive = location.pathname === targetPath && location.hash === targetHash;
            return (
              <NavLink
                key={`${item.label}-${idx}`}
                to={item.path}
                onClick={onClose}
                className={() =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isItemActive
                      ? 'bg-occupie-burgundy-800 text-white font-semibold shadow-sm border border-occupie-brass-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-occupie-navy-850'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-occupie-teal-400" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-occupie-navy-800 bg-occupie-navy-950/40">
          {logoutError && <p role="alert" className="mb-2 text-xs text-rose-200">{logoutError}</p>}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-occupie-navy-850/80 border border-occupie-navy-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-occupie-cyan-600 to-occupie-teal-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{roleConfig?.title}</p>
            </div>
            {isDemoMode ? <Link to="/auth/demo-roles" title="Switch preview role" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-occupie-navy-800 transition-colors">
              <LogOut className="w-4 h-4" />
            </Link> : <button type="button" onClick={async () => { setLogoutError(''); const result = await logout(); if (result.success) navigate('/auth/login', { replace: true }); else setLogoutError(result.error || 'Could not sign out. Try again.'); }} title="Sign out" aria-label="Sign out" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-occupie-navy-800 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
