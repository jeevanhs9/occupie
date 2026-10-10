import React, { useEffect, useRef, useState } from 'react';

const NARRATIVE = [
  { at: 0, eyebrow: 'The arrival', line: 'An exceptional welcome begins before the first course.' },
  { at: 0.26, eyebrow: 'At the door', line: 'Every arrival deserves the right table.' },
  { at: 0.55, eyebrow: 'In the room', line: 'Every table. Every moment. Considered.' },
  { at: 0.8, eyebrow: 'After dark', line: 'Hospitality, intelligently arranged.' },
];

function getNarrative(progress) {
  return [...NARRATIVE].reverse().find((item) => progress >= item.at) || NARRATIVE[0];
}

export function ScrollVideoExperience() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const update = () => {
      frameRef.current = null;
      const section = sectionRef.current;
      const video = videoRef.current;
      if (!section) return;

      const start = section.offsetTop;
      const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
      const nextProgress = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
      setProgress((current) => Math.abs(current - nextProgress) > 0.01 ? nextProgress : current);

      if (ready && video?.duration && !reducedMotion) {
        const desiredTime = nextProgress * Math.max(video.duration - 0.08, 0);
        if (Math.abs(video.currentTime - desiredTime) > 0.08) video.currentTime = desiredTime;
      }
    };
    const requestUpdate = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [ready]);

  const narrative = getNarrative(progress);

  return (
    <section ref={sectionRef} id="experience" className="cinematic-journey" aria-label="A journey through the restaurant">
      <div className="cinematic-stage">
        {!failed && (
          <video
            ref={videoRef}
            className="cinematic-video"
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => { event.currentTarget.currentTime = 0; setReady(true); }}
            onError={() => setFailed(true)}
            aria-hidden="true"
          >
            <source src="/videos/occupie-restaurant-hero.mp4" type="video/mp4" />
          </video>
        )}
        <div className="cinematic-shade" />
        <div className="cinematic-grain" aria-hidden="true" />

        <div className="cinematic-copy" key={narrative.eyebrow}>
          <p className="eyebrow">{narrative.eyebrow}</p>
          <p className="cinematic-line">{narrative.line}</p>
        </div>

        <div className="journey-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        {!ready && !failed && <p className="video-status">Preparing the dining room</p>}
        {failed && <p className="video-status">The restaurant film could not be loaded.</p>}
        <p className="scroll-prompt" aria-hidden="true">Scroll to enter <span>↓</span></p>
      </div>
    </section>
  );
}

export default ScrollVideoExperience;
