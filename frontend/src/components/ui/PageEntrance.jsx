import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** A brief page entrance that never delays access to the page content. */
export function PageEntrance({ children, className = '', ...props }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default PageEntrance;
