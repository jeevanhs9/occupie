import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  glass = false,
  ...props
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={`rounded-xl border transition-all duration-200
        ${glass ? 'glass-card-light' : 'bg-occupie-cream border-stone-200 shadow-card'}
        ${hoverEffect ? 'hover:shadow-card-hover hover:border-occupie-brass-400/70' : ''}
        ${className}`}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div className={`p-5 sm:p-6 pb-2 border-b border-stone-200/70 flex items-start justify-between gap-4 ${className}`}>
      <div className="space-y-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`font-display text-lg sm:text-xl font-normal text-slate-900 tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
