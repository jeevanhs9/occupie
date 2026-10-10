import React from 'react';

/**
 * High-fidelity vector lockup for the authentic Occupie brand mark and wordmark.
 * Features the four diners seated around the central dining table,
 * with the signature active emerald seat and warm ivory/brass gold tones.
 */
export function OccupieHeroLockup({ variant = 'intro', className = '' }) {
  const isIntro = variant === 'intro';
  const markSize = isIntro ? 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44' : 'w-20 h-20 sm:w-24 sm:h-24';
  const textSize = isIntro ? 'text-2xl sm:text-3xl md:text-4xl tracking-[0.28em]' : 'text-lg sm:text-xl tracking-[0.24em]';

  return (
    <div className={`occupie-hero-lockup flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Authentic Occupie Mark */}
      <div className={`relative ${markSize} flex items-center justify-center`}>
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
          aria-hidden="true"
        >
          <defs>
            {/* Shimmer gradient for metallic gold / warm ivory highlight */}
            <linearGradient id={`${variant}-goldShine`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffaf2" />
              <stop offset="35%" stopColor="#f3eee5" />
              <stop offset="70%" stopColor="#d5bf8b" />
              <stop offset="100%" stopColor="#b4945a" />
            </linearGradient>

            {/* Glowing active seat (emerald) */}
            <radialGradient id={`${variant}-seatGlow`} cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </radialGradient>

            {/* Atmosphere soft ambient glow */}
            <radialGradient id={`${variant}-ambient`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(213, 191, 139, 0.16)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Ambient subtle glow behind mark */}
          <circle cx="120" cy="120" r="85" fill={`url(#${variant}-ambient)`} />

          <g transform="translate(120, 120)">
            {/* Center Table Dot */}
            <circle cx="0" cy="0" r="13" fill={`url(#${variant}-goldShine)`} />

            {/* 1. Top-Left Diner */}
            <g transform="rotate(0)">
              <circle cx="-46" cy="-46" r="17.5" fill={`url(#${variant}-goldShine)`} />
              <path
                d="M -9 -38 L -9 -14 A 5 5 0 0 1 -14 -9 L -38 -9 A 9 9 0 0 0 -47 -18 L -47 -23 A 24 24 0 0 1 -23 -47 L -18 -47 A 9 9 0 0 0 -9 -38 Z"
                fill={`url(#${variant}-goldShine)`}
              />
            </g>

            {/* 2. Top-Right Diner */}
            <g transform="rotate(90)">
              <circle cx="-46" cy="-46" r="17.5" fill={`url(#${variant}-goldShine)`} />
              <path
                d="M -9 -38 L -9 -14 A 5 5 0 0 1 -14 -9 L -38 -9 A 9 9 0 0 0 -47 -18 L -47 -23 A 24 24 0 0 1 -23 -47 L -18 -47 A 9 9 0 0 0 -9 -38 Z"
                fill={`url(#${variant}-goldShine)`}
              />
            </g>

            {/* 3. Bottom-Left Diner */}
            <g transform="rotate(270)">
              <circle cx="-46" cy="-46" r="17.5" fill={`url(#${variant}-goldShine)`} />
              <path
                d="M -9 -38 L -9 -14 A 5 5 0 0 1 -14 -9 L -38 -9 A 9 9 0 0 0 -47 -18 L -47 -23 A 24 24 0 0 1 -23 -47 L -18 -47 A 9 9 0 0 0 -9 -38 Z"
                fill={`url(#${variant}-goldShine)`}
              />
            </g>

            {/* 4. Bottom-Right Diner (Occupied / Active: Emerald Green Seat) */}
            <g transform="rotate(180)">
              <circle
                cx="-46"
                cy="-46"
                r="17.5"
                fill={`url(#${variant}-seatGlow)`}
                className="filter drop-shadow-[0_0_10px_rgba(16,185,129,0.7)]"
              />
              <path
                d="M -9 -38 L -9 -14 A 5 5 0 0 1 -14 -9 L -38 -9 A 9 9 0 0 0 -47 -18 L -47 -23 A 24 24 0 0 1 -23 -47 L -18 -47 A 9 9 0 0 0 -9 -38 Z"
                fill={`url(#${variant}-goldShine)`}
              />
            </g>
          </g>
        </svg>
      </div>

      {/* Wordmark */}
      <h2
        className={`occupie-wordmark font-sans font-extrabold text-[#fffaf2] uppercase mt-5 sm:mt-6 pl-[0.28em] ${textSize} select-none`}
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          textShadow: '0 2px 20px rgba(0,0,0,0.85), 0 0 30px rgba(213,191,139,0.2)',
        }}
      >
        OCCUPIE
      </h2>

      {variant === 'destination' && (
        <p className="mt-3 text-xs sm:text-sm font-sans tracking-[0.16em] uppercase text-[#e2d1aa]/90 drop-shadow-md">
          Intelligent hospitality at every table
        </p>
      )}
    </div>
  );
}

export default OccupieHeroLockup;
