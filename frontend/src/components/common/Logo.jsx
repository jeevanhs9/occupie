import React from 'react';
import { Link } from 'react-router-dom';

export function Logo({ size = 'md', theme = 'dark', withLink = true, withTagline = false }) {
  const isLight = theme === 'light';

  const markSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className="flex items-center gap-2.5 group">
      {/* Brand Geometric Mark */}
      <div className={`${markSizes[size] || markSizes.md} rounded-xl bg-gradient-to-br from-occupie-navy-900 via-slate-900 to-occupie-navy-800 p-0.5 shadow-md shadow-occupie-navy-950/20 border border-occupie-navy-700/80 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-200`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-occupie-teal-500/20 to-occupie-cyan-400/20" />
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-occupie-teal-400 stroke-current relative z-10" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Stylized Modern Dining Table & Seating Node */}
          <rect x="5" y="7" width="14" height="6" rx="2" className="fill-occupie-teal-500/20" />
          <path d="M12 13v7" />
          <path d="M7 20h10" />
          <circle cx="12" cy="4" r="1.5" className="fill-occupie-cyan-400 stroke-none" />
          <circle cx="3" cy="10" r="1.5" className="fill-occupie-teal-400 stroke-none" />
          <circle cx="21" cy="10" r="1.5" className="fill-occupie-teal-400 stroke-none" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-extrabold tracking-tight ${titleSizes[size] || titleSizes.md} ${isLight ? 'text-white' : 'text-slate-900'}`}>
          Occupie<span className="text-occupie-teal-500">.</span>
        </span>
        {withTagline && (
          <span className={`text-[10px] font-medium tracking-wide uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Smart Table Allocation
          </span>
        )}
      </div>
    </div>
  );

  if (withLink) {
    return (
      <Link to="/" className="inline-flex focus:outline-none focus:ring-2 focus:ring-occupie-cyan-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
