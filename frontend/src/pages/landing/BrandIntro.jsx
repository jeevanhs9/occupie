import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from '../../components/common/Logo';

export function BrandIntro({ onComplete }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onComplete, reduceMotion ? 0 : 1750);
    return () => window.clearTimeout(timer);
  }, [onComplete, reduceMotion]);

  return (
    <motion.div
      className="brand-intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.4 } }}
      aria-label="Occupie introduction"
    >
      <div className="brand-intro-content">
        <Logo size="lg" theme="light" withLink={false} />
        <p>Intelligent Seating. Exceptional Hospitality.</p>
      </div>
    </motion.div>
  );
}

export default BrandIntro;
