import React from 'react';

/**
 * Native SVG lockup using the same mark geometry, colors, and wordmark as
 * /brand/occupie-logo-on-dark.svg. The scene owns the shared entrance timing.
 */
export function NativeBrandAnimation({ className = '' }) {
  return (
    <div className={`${className} native-brand-animation`.trim()} aria-label="Occupie brand animation" role="img">
      <svg
        viewBox="0 0 320 80"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        className="native-brand-svg"
        aria-hidden="true"
        focusable="false"
      >
        <g transform="translate(40, 40) scale(0.32)" className="brand-mark">
          <circle className="brand-mark-center" cx="0" cy="0" r="14" fill="#F3EEE5" />

          <g className="brand-seat brand-seat-one">
            <circle cx="-46" cy="-46" r="18" fill="#F3EEE5" />
            <path d="M -9 -36 L -9 -14 A 5 5 0 0 1 -14 -9 L -36 -9 A 10 10 0 0 0 -46 -19 L -46 -24 A 22 22 0 0 1 -24 -46 L -19 -46 A 10 10 0 0 0 -9 -36 Z" fill="#F3EEE5" />
          </g>
          <g transform="rotate(90)" className="brand-seat brand-seat-two">
            <circle cx="-46" cy="-46" r="18" fill="#F3EEE5" />
            <path d="M -9 -36 L -9 -14 A 5 5 0 0 1 -14 -9 L -36 -9 A 10 10 0 0 0 -46 -19 L -46 -24 A 22 22 0 0 1 -24 -46 L -19 -46 A 10 10 0 0 0 -9 -36 Z" fill="#F3EEE5" />
          </g>
          <g transform="rotate(270)" className="brand-seat brand-seat-three">
            <circle cx="-46" cy="-46" r="18" fill="#F3EEE5" />
            <path d="M -9 -36 L -9 -14 A 5 5 0 0 1 -14 -9 L -36 -9 A 10 10 0 0 0 -46 -19 L -46 -24 A 22 22 0 0 1 -24 -46 L -19 -46 A 10 10 0 0 0 -9 -36 Z" fill="#F3EEE5" />
          </g>
          <g transform="rotate(180)" className="brand-seat brand-seat-four">
            <circle cx="-46" cy="-46" r="18" fill="#10B981" />
            <path d="M -9 -36 L -9 -14 A 5 5 0 0 1 -14 -9 L -36 -9 A 10 10 0 0 0 -46 -19 L -46 -24 A 22 22 0 0 1 -24 -46 L -19 -46 A 10 10 0 0 0 -9 -36 Z" fill="#F3EEE5" />
          </g>
        </g>

        <text
          x="82"
          y="49"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontSize="28"
          fontWeight="800"
          letterSpacing="0.12em"
          fill="#F3EEE5"
          className="brand-wordmark"
        >
          OCCUPIE
        </text>
      </svg>
    </div>
  );
}

export default NativeBrandAnimation;
