import React, { forwardRef } from 'react';
import { LogoFrameAnimation } from './LogoFrameAnimation';
import './LogoFrameAnimation.css';

/**
 * Integration boundary for the supplied Occupie logo sequence. The cinematic
 * section owns the shared scroll progress; this component only renders frames.
 */
export const BrandAnimation = forwardRef(function BrandAnimation(props, ref) {
  return <LogoFrameAnimation ref={ref} {...props} />;
});

export default BrandAnimation;
