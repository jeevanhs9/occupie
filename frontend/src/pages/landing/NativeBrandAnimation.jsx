import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Native React/SVG logo animation for Occupie.
 * Animates a top-down restaurant seating view with central table and four seats.
 * Replaces the video-based logo animation with a crisp, scalable SVG implementation.
 */
export function NativeBrandAnimation({ className = '' }) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!reduceMotion) {
      // Trigger animation after mount
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    }
    setMounted(true);
    return undefined;
  }, [reduceMotion]);

  return (
    <div
      className={`${className} native-brand-animation`.trim()}
      aria-label="Occupie brand animation"
      data-animated={!reduceMotion && mounted}
    >
      <svg
        viewBox="0 0 320 100"
        xmlns="http://www.w3.org/2000/svg"
        className="native-brand-svg"
        aria-hidden="true"
      >
        {/* Definitions for effects */}
        <defs>
          {/* Warm glow filter for illumination effect */}
          <filter id="warmGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#d4a574" floodOpacity="0.7" />
            <feComposite in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle accent glow for the occupied seat */}
          <filter id="accentGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feFlood floodColor="#10B981" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Light sweep gradient */}
          <linearGradient id="lightSweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4a574" stopOpacity="0" />
            <stop offset="50%" stopColor="#d4a574" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d4a574" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background starfield effect */}
        <g className="starfield">
          <circle cx="45" cy="25" r="0.8" fill="#d4a574" className="star star-1" />
          <circle cx="275" cy="35" r="1" fill="#f3eee5" className="star star-2" />
          <circle cx="90" cy="70" r="0.6" fill="#d4a574" className="star star-3" />
          <circle cx="230" cy="75" r="0.9" fill="#f3eee5" className="star star-4" />
          <circle cx="160" cy="20" r="0.7" fill="#d4a574" className="star star-5" />
        </g>

        {/* Main logo mark - positioned left side */}
        <g transform="translate(52, 50)" className="logo-mark">
          {/* Center table */}
          <circle
            cx="0"
            cy="0"
            r="4.5"
            fill="#f3eee5"
            className="center-table"
          />

          {/* Top-Left seat */}
          <g className="seat seat-top-left" transform="translate(-14.7, -14.7)">
            <circle cx="0" cy="0" r="5.8" fill="#f3eee5" className="seat-circle" />
            <path
              d="M -2.9 -11.5 L -2.9 -4.5 A 1.6 1.6 0 0 1 -4.5 -2.9 L -11.5 -2.9 A 3.2 3.2 0 0 0 -14.7 -6.1 L -14.7 -7.7 A 7 7 0 0 1 -7.7 -14.7 L -6.1 -14.7 A 3.2 3.2 0 0 0 -2.9 -11.5 Z"
              fill="#f3eee5"
              className="seat-connector"
            />
          </g>

          {/* Top-Right seat */}
          <g className="seat seat-top-right" transform="translate(14.7, -14.7) rotate(90)">
            <circle cx="0" cy="0" r="5.8" fill="#f3eee5" className="seat-circle" />
            <path
              d="M -2.9 -11.5 L -2.9 -4.5 A 1.6 1.6 0 0 1 -4.5 -2.9 L -11.5 -2.9 A 3.2 3.2 0 0 0 -14.7 -6.1 L -14.7 -7.7 A 7 7 0 0 1 -7.7 -14.7 L -6.1 -14.7 A 3.2 3.2 0 0 0 -2.9 -11.5 Z"
              fill="#f3eee5"
              className="seat-connector"
            />
          </g>

          {/* Bottom-Left seat */}
          <g className="seat seat-bottom-left" transform="translate(-14.7, 14.7) rotate(270)">
            <circle cx="0" cy="0" r="5.8" fill="#f3eee5" className="seat-circle" />
            <path
              d="M -2.9 -11.5 L -2.9 -4.5 A 1.6 1.6 0 0 1 -4.5 -2.9 L -11.5 -2.9 A 3.2 3.2 0 0 0 -14.7 -6.1 L -14.7 -7.7 A 7 7 0 0 1 -7.7 -14.7 L -6.1 -14.7 A 3.2 3.2 0 0 0 -2.9 -11.5 Z"
              fill="#f3eee5"
              className="seat-connector"
            />
          </g>

          {/* Bottom-Right seat - emerald (occupied) */}
          <g className="seat seat-bottom-right seat-occupied" transform="translate(14.7, 14.7) rotate(180)">
            <circle cx="0" cy="0" r="5.8" fill="#10B981" className="seat-circle seat-circle-occupied" />
            <path
              d="M -2.9 -11.5 L -2.9 -4.5 A 1.6 1.6 0 0 1 -4.5 -2.9 L -11.5 -2.9 A 3.2 3.2 0 0 0 -14.7 -6.1 L -14.7 -7.7 A 7 7 0 0 1 -7.7 -14.7 L -6.1 -14.7 A 3.2 3.2 0 0 0 -2.9 -11.5 Z"
              fill="#f3eee5"
              className="seat-connector"
            />
          </g>

          {/* Light sweep overlay */}
          <rect
            x="-25"
            y="-25"
            width="50"
            height="50"
            fill="url(#lightSweep)"
            className="light-sweep"
            opacity="0"
          />
        </g>

        {/* Typography: OCCUPIE */}
        <text
          x="82"
          y="57"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontSize="22"
          fontWeight="800"
          letterSpacing="0.12em"
          fill="#f3eee5"
          className="brand-text"
        >
          OCCUPIE
        </text>

        {/* Seat interaction highlights */}
        <g transform="translate(52, 50)" className="seat-highlights">
          <circle cx="-14.7" cy="-14.7" r="6.5" fill="none" stroke="#d4a574" strokeWidth="1.5" opacity="0" className="highlight highlight-1" />
          <circle cx="14.7" cy="-14.7" r="6.5" fill="none" stroke="#d4a574" strokeWidth="1.5" opacity="0" className="highlight highlight-2" />
          <circle cx="-14.7" cy="14.7" r="6.5" fill="none" stroke="#d4a574" strokeWidth="1.5" opacity="0" className="highlight highlight-3" />
          <circle cx="14.7" cy="14.7" r="6.5" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0" className="highlight highlight-4" />
        </g>
      </svg>
    </div>
  );
}

export default NativeBrandAnimation;
