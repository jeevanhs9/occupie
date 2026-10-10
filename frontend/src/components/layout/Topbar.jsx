import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, ExternalLink, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRole } from '../../hooks/useRole';
import { DATA_MODE, fetchHealth } from '../../services/api';
import Badge from '../ui/Badge';

export function Topbar({ onMenuClick }) {
  const { roleConfig, currentRole } = useRole();
  const [apiHealth, setApiHealth] = useState({ status: 'checking', message: 'Checking API...' });

  useEffect(() => {
    let isMounted = true;
    async function checkApi() {
      const res = await fetchHealth();
      if (!isMounted) return;
      if (res.success && res.data?.status === 'ok') {
        setApiHealth({ status: 'online', data: res.data });
      } else {
        setApiHealth({ status: 'offline', error: res.error || 'Backend not reachable' });
      }
    }
    checkApi();
    const interval = setInterval(checkApi, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger & Role Context Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {roleConfig?.title}
            <Badge variant="teal" size="sm" className="hidden sm:inline-flex">
              {roleConfig?.badge}
            </Badge>
          </h1>
        </div>
      </div>

      {/* Right: data mode, API health & Landing Link */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div
          title={DATA_MODE === 'demo' ? 'Showing temporary in-memory preview fixtures.' : 'Dashboard data is loaded from the configured Flask API.'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${DATA_MODE === 'demo' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
        >
          <span className={`w-2 h-2 rounded-full ${DATA_MODE === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          {DATA_MODE === 'demo' ? 'Demo data' : 'API data'}
        </div>

        <div
          title={
            apiHealth.status === 'online'
              ? `Connected to Flask API (${apiHealth.data?.service} ${apiHealth.data?.version})`
              : apiHealth.status === 'checking'
                ? 'Checking Flask API health'
                : 'Flask API is unavailable. Start the backend on port 5000.'
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 border-slate-200"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              apiHealth.status === 'online' ? 'bg-emerald-500' : apiHealth.status === 'checking' ? 'bg-sky-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="hidden md:inline text-slate-600">
            {apiHealth.status === 'online' ? 'API: Connected' : apiHealth.status === 'checking' ? 'API: Checking' : 'API: Unavailable'}
          </span>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl transition-colors"
        >
          <span>Landing Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}

export default Topbar;
