import React from 'react';
import { NativeBrandAnimation } from './NativeBrandAnimation';
import './NativeBrandAnimation.css';

/**
 * Brand animation integration for the Occupie logo.
 * Now uses native React/SVG animation instead of video.
 * Preserves the same integration boundary for the cinematic scene.
 */
export function BrandAnimation({ className = '' }) {
  return <NativeBrandAnimation className={className} />;
}

export default BrandAnimation;
