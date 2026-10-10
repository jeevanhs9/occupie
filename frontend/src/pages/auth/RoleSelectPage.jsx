import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { ROLES, ROLE_CONFIGS } from '../../lib/constants';
import { Logo } from '../../components/common/Logo';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  UserCheck,
  UtensilsCrossed,
  CalendarCheck,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

const ICON_MAP = {
  [ROLES.MANAGER]: ShieldCheck,
  [ROLES.HOST]: UserCheck,
  [ROLES.FLOOR_STAFF]: UtensilsCrossed,
  [ROLES.CUSTOMER]: CalendarCheck,
};

export function RoleSelectPage() {
  const navigate = useNavigate();
  const { loginAsRole } = useRole();

  const handleSelectRole = (roleKey) => {
    loginAsRole(roleKey);
    navigate(ROLE_CONFIGS[roleKey].route);
  };

  return (
    <div className="role-sandbox-page min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-occupie-teal-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-occupie-navy-900/80 px-3 py-1.5 rounded-xl border border-occupie-navy-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto w-full relative z-10">
        {/* Header Title */}
        <div className="text-center mb-10">
          <div className="inline-block mb-3">
            <Logo size="lg" theme="dark" withLink={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Role Sandbox & UI Preview
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Select an operational role below to inspect its dedicated dashboard, custom navigation, and mock actions.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Demo Environment Only:</strong> Server-side JWT authentication & role authorization will be enforced in Phase 2.
            </span>
          </div>
        </div>

        {/* 4 Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.values(ROLE_CONFIGS).map((config) => {
            const Icon = ICON_MAP[config.id] || ShieldCheck;

            return (
              <button
                key={config.id}
                type="button"
                onClick={() => handleSelectRole(config.id)}
                className="group w-full p-6 rounded-3xl bg-occupie-navy-900/80 border border-occupie-navy-800 hover:border-occupie-teal-500/50 hover:bg-occupie-navy-850 cursor-pointer transition-all duration-200 shadow-lg flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-occupie-teal-400"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-occupie-navy-800 to-occupie-navy-700 border border-occupie-navy-600 flex items-center justify-center text-occupie-teal-400 group-hover:scale-110 group-hover:text-occupie-cyan-300 transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="navy" size="sm" className="border-occupie-navy-700 text-slate-300">
                      {config.badge}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-occupie-teal-300 transition-colors">
                    {config.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {config.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-occupie-navy-800/80 flex items-center justify-between text-xs font-semibold text-occupie-teal-400 group-hover:text-occupie-teal-300">
                  <span>Enter {config.title.split(' ')[0]} Dashboard</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Already have regular login credentials?{' '}
          <Link to="/auth/login" className="text-occupie-teal-400 hover:underline font-semibold">
            Standard Login Screen
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RoleSelectPage;
