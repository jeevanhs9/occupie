import React from 'react';

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium rounded-md gap-1',
    md: 'text-xs px-2.5 py-1 font-medium rounded-full gap-1.5',
    lg: 'text-sm px-3 py-1 font-semibold rounded-full gap-1.5',
  };

  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200/80',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    info: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    teal: 'bg-occupie-brass-300/30 text-occupie-walnut-950 border border-occupie-brass-500/40',
    navy: 'bg-occupie-burgundy-900 text-white border border-occupie-burgundy-700',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    teal: 'bg-teal-500',
    navy: 'bg-occupie-brass-400',
  };

  return (
    <span className={`inline-flex items-center ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.default} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-current'}`} />
      )}
      {children}
    </span>
  );
}

export default Badge;
