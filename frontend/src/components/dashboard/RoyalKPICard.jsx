import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Premium KPI card with animated counter for Manager Dashboard
 */
export function RoyalKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accentColor = 'brass',
  delay = 0,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Animate numeric values
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    const duration = 1200;
    const steps = 30;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, numericValue);
      
      if (typeof value === 'string' && value.includes('%')) {
        setDisplayValue(`${Math.round(current)}%`);
      } else if (typeof value === 'string' && value.includes('/')) {
        const parts = value.split('/');
        setDisplayValue(`${Math.round(current)}/${parts[1]}`);
      } else {
        setDisplayValue(Math.round(current));
      }

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, shouldReduceMotion]);

  const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  const accentColors = {
    brass: 'text-occupie-brass-500',
    burgundy: 'text-occupie-burgundy-700',
    sage: 'text-occupie-sage-400',
    amber: 'text-amber-500',
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
      className="royal-kpi-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="royal-kpi-label">{title}</div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg bg-gradient-to-br from-occupie-cream to-occupie-ivory border border-occupie-brass-300/20 ${accentColors[accentColor] || accentColors.brass}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>

      <div className="royal-kpi-value">{displayValue}</div>

      {subtitle && (
        <div className="royal-kpi-subtitle">{subtitle}</div>
      )}

      {trend && trendValue && (
        <div className={`royal-kpi-trend ${trend}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}

export default RoyalKPICard;
