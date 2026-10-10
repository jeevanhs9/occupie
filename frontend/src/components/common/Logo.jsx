import React from 'react';
import { Link } from 'react-router-dom';

// Add the owner-supplied full lockups at these paths. `theme="light"` is used
// on dark surfaces; `theme="dark"` is used on light surfaces.
const LOGO_ASSETS = {
  light: '/brand/occupie-logo-on-dark.svg',
  dark: '/brand/occupie-logo-on-light.svg',
};

const LOGO_HEIGHTS = {
  sm: '1.5rem',
  md: '2rem',
  lg: '2.5rem',
};

/** Shared asset-backed Occupie lockup used by landing, auth, and dashboard UI. */
export function Logo({ size = 'md', theme = 'dark', withLink = true, className = '' }) {
  const image = (
    <img
      src={LOGO_ASSETS[theme] || LOGO_ASSETS.dark}
      alt=""
      aria-hidden="true"
      className={`occupie-logo-image ${className}`.trim()}
      style={{ height: LOGO_HEIGHTS[size] || LOGO_HEIGHTS.md }}
      onError={(event) => {
        // Keep the UI clean until the official lockup is added at the path above.
        event.currentTarget.hidden = true;
      }}
    />
  );
  const lockup = <span className={`occupie-logo occupie-logo--${size}`}>{image}</span>;

  if (withLink) {
    return (
      <Link to="/" aria-label="Occupie home" className="occupie-logo-link inline-flex items-center focus:outline-none focus:ring-2 focus:ring-occupie-brass-400 rounded-lg">
        {lockup}
      </Link>
    );
  }

  return <span role="img" aria-label="Occupie logo" className="occupie-logo-static">{lockup}</span>;
}

export default Logo;
