import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  accentColor = 'teal',
  className = '',
}) {
  const accentBgs = {
    teal: 'bg-occupie-brass-300/30 text-occupie-burgundy-700 border-occupie-brass-500/40',
    cyan: 'bg-occupie-burgundy-50 text-occupie-burgundy-700 border-occupie-burgundy-200/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
    indigo: 'bg-occupie-burgundy-50 text-occupie-burgundy-700 border-occupie-burgundy-200/60',
    navy: 'bg-occupie-walnut-900 text-occupie-brass-300 border-occupie-walnut-700',
  };

  return (
    <div className={`p-5 sm:p-6 rounded-xl bg-occupie-cream border border-stone-200 shadow-card hover:shadow-card-hover hover:border-occupie-brass-400/70 transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</span>
            {trendValue && (
              <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                trend === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : trend === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {trend === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 pt-0.5">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl border ${accentBgs[accentColor] || accentBgs.teal} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
