import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { ROLES, ROLE_CONFIGS } from '../../lib/constants';
import { Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

export function RoleSwitcherBanner() {
  const { currentRole, switchRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = (roleKey) => {
    switchRole(roleKey);
    const targetRoute = ROLE_CONFIGS[roleKey].route;
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  return (
    <div className="bg-occupie-navy-950 border-b border-occupie-navy-800 text-slate-300 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Phase 1 Demo Mode
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Viewing dashboard as: <strong className="text-white font-medium">{ROLE_CONFIGS[currentRole]?.title}</strong>
          </span>
        </div>

        {/* Quick Role Switcher Pills */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-slate-400 text-[11px] mr-1 hidden lg:inline">Switch Perspective:</span>
          {Object.values(ROLE_CONFIGS).map((config) => {
            const isActive = currentRole === config.id;
            return (
              <button
                key={config.id}
                onClick={() => handleRoleChange(config.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-occupie-teal-500 text-occupie-navy-950 font-bold shadow-sm'
                    : 'bg-occupie-navy-900 text-slate-300 hover:text-white hover:bg-occupie-navy-800 border border-occupie-navy-800'
                }`}
                title={config.description}
              >
                {config.title.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RoleSwitcherBanner;
