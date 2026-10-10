import React, { useCallback, useEffect, useRef, useState } from 'react';

const NARRATIVE = [
  { at: 0, eyebrow: 'The arrival', line: 'An exceptional welcome begins before the first course.' },
  { at: 0.26, eyebrow: 'At the door', line: 'Every arrival deserves the right table.' },
  { at: 0.55, eyebrow: 'In the room', line: 'Every table. Every moment. Considered.' },
  { at: 0.8, eyebrow: 'After dark', line: 'Hospitality, intelligently arranged.' },
];

const narrativeFor = (progress) => [...NARRATIVE].reverse().find((item) => progress >= item.at) || NARRATIVE[0];

/**
 * Cinematic scene integration point.
 * Pass renderScene={({ reducedMotion, playbackEnabled }) => <RestaurantEntranceAnimation reducedMotion={reducedMotion} playbackEnabled={playbackEnabled} />} when it is ready.
 * The current restaurant MP4 remains the default scene and is never mounted alongside it.
 */
export function CinematicScene({ renderScene, playbackEnabled = true }) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(Boolean(query?.matches));
    updatePreference();
    query?.addEventListener?.('change', updatePreference);
    return () => query?.removeEventListener?.('change', updatePreference);
  }, []);

  const attemptPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedMotion || videoError || renderScene || !playbackEnabled) return;
    video.muted = true;
    const playback = video.play();
    playback?.catch?.(() => setAutoplayBlocked(true));
  }, [playbackEnabled, reducedMotion, renderScene, videoError]);

  useEffect(() => {
    if (reducedMotion || !playbackEnabled) {
      videoRef.current?.pause();
      return;
    }
    if (videoReady) attemptPlayback();
  }, [attemptPlayback, playbackEnabled, reducedMotion, videoReady]);

  useEffect(() => {
    const updateProgress = () => {
      animationFrameRef.current = null;
      const section = sectionRef.current;
      if (!section) return;
      const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
      const travelled = -section.getBoundingClientRect().top;
      const nextProgress = Math.max(0, Math.min(1, travelled / distance));
      setProgress((current) => Math.abs(current - nextProgress) > 0.008 ? nextProgress : current);
    };
    const requestUpdate = () => {
      if (!animationFrameRef.current) animationFrameRef.current = window.requestAnimationFrame(updateProgress);
    };
    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const narrative = narrativeFor(progress);

  return (
    <section ref={sectionRef} id="experience" className="cinematic-journey" aria-label="A journey through the restaurant">
      <div className="cinematic-stage">
        <div className="cinematic-scene-slot">
          {renderScene ? renderScene({ reducedMotion, playbackEnabled }) : !videoError && (
            <video
              ref={videoRef}
              className="cinematic-video"
              poster="/frames/frame_0001.webp"
              autoPlay={!reducedMotion && playbackEnabled}
              muted
              playsInline
              loop={!reducedMotion}
              preload="auto"
              controls={autoplayBlocked}
              onCanPlay={() => { setVideoReady(true); attemptPlayback(); }}
              onError={() => setVideoError(true)}
              aria-label="Restaurant entrance and dining room film"
            >
              <source src="/videos/occupie-restaurant-hero.mp4" type="video/mp4" />
            </video>
          )}
          {videoError && !renderScene && <div className="cinematic-video-fallback" role="img" aria-label="Restaurant film unavailable" />}
        </div>
        <div className="cinematic-shade" />
        <div className="cinematic-grain" aria-hidden="true" />
        <div className="cinematic-copy" key={narrative.eyebrow}>
          <p className="eyebrow">{narrative.eyebrow}</p>
          <h1 className="cinematic-line">{narrative.line}</h1>
          <p className="cinematic-caption">A considered welcome begins with a clear view of the room.</p>
        </div>
        <div className="journey-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
        {!renderScene && !videoReady && !videoError && <p className="video-status">Preparing the dining room</p>}
        {videoError && !renderScene && <p className="video-status">The restaurant film could not be loaded.</p>}
        {autoplayBlocked && !videoError && <p className="video-status">Playback is ready. Use the video controls to begin.</p>}
        <p className="scroll-prompt">Scroll to enter <span aria-hidden="true">↓</span></p>
      </div>
    </section>
  );
}

export default CinematicScene;
