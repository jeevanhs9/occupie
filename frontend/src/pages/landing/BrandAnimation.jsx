import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Logo } from '../../components/common/Logo';

const DEFAULT_ANIMATION_SRC = '/videos/occupie-logo-animation.mp4';

/**
 * Small integration boundary for Occupie's supplied logo animation.
 * The source, looping behavior, and placement can be changed independently of
 * the cinematic scene and its scroll-driven restaurant frames.
 */
export function BrandAnimation({
  src = DEFAULT_ANIMATION_SRC,
  className = '',
  loop = false,
  playbackRate = 1,
}) {
  const videoRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (reduceMotion || unavailable) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;
    if (typeof video.canPlayType !== 'function' || !video.canPlayType('video/mp4')) {
      setUnavailable(true);
      return undefined;
    }

    let active = true;
    video.playbackRate = Math.min(Math.max(playbackRate, 0.25), 2);
    const play = video.play();
    if (play?.catch) {
      play.catch(() => {
        if (active) setUnavailable(true);
      });
    }

    return () => {
      active = false;
      video.pause();
    };
  }, [reduceMotion, unavailable, src, playbackRate]);

  return (
    <div className={className} aria-label="Occupie brand animation">
      {reduceMotion || unavailable ? (
        <Logo size="lg" theme="light" withLink={false} />
      ) : (
        <video
          ref={videoRef}
          className="brand-animation-video"
          src={src}
          autoPlay
          muted
          playsInline
          loop={loop}
          preload="auto"
          aria-hidden="true"
          onError={() => setUnavailable(true)}
        />
      )}
    </div>
  );
}

export default BrandAnimation;
