import React, { useEffect, useRef, useState } from 'react';
import { BrandAnimation } from './BrandAnimation';

const FRAME_COUNT = 120;
const FRAME_DIRECTORY = '/frames/';
const DECODED_FRAME_LIMIT = 8;
const LOGO_LAST_FRAME = 119;
const LOGO_COMPLETE_FRAME = 108;
const LOGO_COMPLETE_AT = 0.46;
const LOGO_HOLD_UNTIL = 0.68;
const LOGO_SEQUENCE_END = 0.8;

const NARRATIVE = [
  { at: 0, eyebrow: 'The arrival', lines: ['An exceptional welcome', 'begins before the first course.'] },
  { at: 0.26, eyebrow: 'At the door', lines: ['Every arrival deserves', 'the right table.'] },
  { at: 0.55, eyebrow: 'In the room', lines: ['Every table. Every moment.', 'Considered.'] },
  { at: 0.8, eyebrow: 'After dark', lines: ['Hospitality, intelligently', 'arranged.'] },
];

const framePath = (index) => `${FRAME_DIRECTORY}frame_${String(index + 1).padStart(4, '0')}.webp`;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

function narrativeIndexFor(progress) {
  for (let index = NARRATIVE.length - 1; index >= 0; index -= 1) {
    if (progress >= NARRATIVE[index].at) return index;
  }
  return 0;
}

function logoProgressForScene(progress) {
  if (progress <= LOGO_COMPLETE_AT) {
    return (progress / LOGO_COMPLETE_AT) * (LOGO_COMPLETE_FRAME / LOGO_LAST_FRAME);
  }
  if (progress <= LOGO_HOLD_UNTIL) return LOGO_COMPLETE_FRAME / LOGO_LAST_FRAME;

  const exitProgress = clamp01((progress - LOGO_HOLD_UNTIL) / (LOGO_SEQUENCE_END - LOGO_HOLD_UNTIL));
  return (LOGO_COMPLETE_FRAME + ((LOGO_LAST_FRAME - LOGO_COMPLETE_FRAME) * exitProgress)) / LOGO_LAST_FRAME;
}

/**
 * Scroll-led restaurant scene. WebP frames are fetched progressively and decoded
 * into a small LRU cache; one RAF coalesces scroll, resize, and frame-ready work.
 * The callback remains the integration point for the separately-produced entrance scene.
 */
export function CinematicScene({ renderScene, playbackEnabled = true }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const logoAnimationRef = useRef(null);
  const progressRef = useRef(0);
  const requestUpdateRef = useRef(null);
  const narrativeIndexRef = useRef(0);
  const playbackEnabledRef = useRef(playbackEnabled);
  const renderSceneRef = useRef(renderScene);
  const reducedMotionRef = useRef(false);
  const [narrativeIndex, setNarrativeIndex] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const [logoFrameError, setLogoFrameError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  playbackEnabledRef.current = playbackEnabled;
  renderSceneRef.current = renderScene;
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const updatePreference = () => setReducedMotion(query.matches);
    query.addEventListener?.('change', updatePreference);
    return () => query.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const stage = stageRef.current;
    // jsdom has no canvas implementation; keep component tests on the static poster fallback.
    if (typeof window.CanvasRenderingContext2D === 'undefined') {
      setFrameError(true);
      return undefined;
    }
    const context = canvas?.getContext('2d', { alpha: false, desynchronized: true });
    if (!canvas || !section || !context) {
      setFrameError(true);
      return undefined;
    }

    const blobs = new Map();
    const blobRequests = new Map();
    const bitmaps = new Map();
    const failedFrames = new Set();
    const abortController = new AbortController();
    let animationFrame = null;
    let decodeInProgress = false;
    let decodedFrame = -1;
    let desiredFrame = 0;
    let prefetchIndex = 1;
    let prefetchHandle = null;
    let prefetchUsesTimeout = false;
    let prefetchRunning = false;
    let active = true;
    let introFrame = null;
    let sourceWidth = 1280;
    let sourceHeight = 720;

    const requestUpdate = () => {
      if (!active || animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updateScene);
    };

    const trimDecodedCache = () => {
      while (bitmaps.size > DECODED_FRAME_LIMIT) {
        const [oldestIndex, oldestBitmap] = bitmaps.entries().next().value;
        bitmaps.delete(oldestIndex);
        oldestBitmap.close?.();
      }
    };

    const fetchBlob = (index) => {
      if (blobs.has(index)) return Promise.resolve(blobs.get(index));
      if (blobRequests.has(index)) return blobRequests.get(index);
      const request = fetch(framePath(index), { signal: abortController.signal, cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`Frame ${index + 1} returned ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          if (active) blobs.set(index, blob);
          return blob;
        })
        .catch((error) => {
          if (error.name !== 'AbortError') failedFrames.add(index);
          throw error;
        })
        .finally(() => blobRequests.delete(index));
      blobRequests.set(index, request);
      return request;
    };

    const decodeFallbackImage = (blob) => new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);
      image.decoding = 'async';
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('The browser could not decode a restaurant frame.'));
      };
      image.src = objectUrl;
    });

    const loadBitmap = async (index) => {
      const cached = bitmaps.get(index);
      if (cached) {
        bitmaps.delete(index);
        bitmaps.set(index, cached);
        return cached;
      }
      const blob = await fetchBlob(index);
      const bitmap = window.createImageBitmap
        ? await window.createImageBitmap(blob)
        : await decodeFallbackImage(blob);
      if (!active) {
        bitmap.close?.();
        return null;
      }
      sourceWidth = bitmap.width || bitmap.naturalWidth || sourceWidth;
      sourceHeight = bitmap.height || bitmap.naturalHeight || sourceHeight;
      bitmaps.set(index, bitmap);
      trimDecodedCache();
      return bitmap;
    };

    const drawBitmap = (index, bitmap) => {
      const viewWidth = Math.max(1, window.innerWidth);
      const viewHeight = Math.max(1, window.innerHeight);
      const deviceScale = Math.min(window.devicePixelRatio || 1, 1.25, sourceWidth / viewWidth, sourceHeight / viewHeight);
      const width = Math.max(1, Math.round(viewWidth * deviceScale));
      const height = Math.max(1, Math.round(viewHeight * deviceScale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
      }

      const imageWidth = bitmap.width || bitmap.naturalWidth;
      const imageHeight = bitmap.height || bitmap.naturalHeight;
      const coverScale = Math.max(width / imageWidth, height / imageHeight);
      const drawWidth = imageWidth * coverScale;
      const drawHeight = imageHeight * coverScale;
      context.fillStyle = '#21160e';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      canvas.dataset.frameIndex = String(index + 1).padStart(4, '0');
      decodedFrame = index;
      canvas.style.opacity = '1';
      setFrameReady(true);
    };

    const drawNearestCached = (targetIndex) => {
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      for (const [index, bitmap] of bitmaps) {
        const distance = Math.abs(index - targetIndex);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      }
      if (nearestIndex >= 0 && nearestIndex !== decodedFrame) drawBitmap(nearestIndex, bitmaps.get(nearestIndex));
    };

    const schedulePrefetch = () => {
      if (!active || prefetchHandle !== null || prefetchRunning || prefetchIndex >= FRAME_COUNT || reducedMotionRef.current || !playbackEnabledRef.current || renderSceneRef.current) return;
      const runChunk = async () => {
        prefetchHandle = null;
        if (prefetchRunning || !active || reducedMotionRef.current || !playbackEnabledRef.current || renderSceneRef.current) return;
        prefetchRunning = true;
        try {
          const stopAt = Math.min(prefetchIndex + 3, FRAME_COUNT);
          while (active && prefetchIndex < stopAt) {
            const nextIndex = prefetchIndex;
            prefetchIndex += 1;
            try {
              await fetchBlob(nextIndex);
            } catch {
              // A missing frame is handled by the nearest decoded frame and status message.
            }
          }
        } finally {
          prefetchRunning = false;
        }
        schedulePrefetch();
      };

      if ('requestIdleCallback' in window) {
        prefetchUsesTimeout = false;
        prefetchHandle = window.requestIdleCallback(runChunk, { timeout: 700 });
      } else {
        prefetchUsesTimeout = true;
        prefetchHandle = window.setTimeout(runChunk, 120);
      }
    };

    function updateScene() {
      animationFrame = null;
      if (!active) return;

      const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
      const travelled = -section.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1, travelled / distance));
      progressRef.current = progress;

      // One scroll value drives the scene frame, logo handoff, and copy exit.
      // Frame 108 is the first stable complete logo composition, including the
      // tagline. Hold it over a generous scroll interval before handing off to
      // the shared navigation logo; using the same progress keeps reversal exact.
      const logoProgress = reducedMotionRef.current
        ? LOGO_COMPLETE_FRAME / LOGO_LAST_FRAME
        : logoProgressForScene(progress);
      const logoHandoff = reducedMotionRef.current ? 1 : clamp01((progress - 0.76) / 0.16);
      const copyExit = reducedMotionRef.current ? 0 : clamp01((progress - 0.82) / 0.17);
      logoAnimationRef.current?.render(logoProgress);
      stage?.style.setProperty('--scene-progress', progress.toFixed(4));
      stage?.style.setProperty('--hero-logo-opacity', String(1 - logoHandoff));
      stage?.style.setProperty('--hero-logo-scale', String(1 - (logoHandoff * 0.08)));
      stage?.style.setProperty('--hero-copy-opacity', String(1 - copyExit));
      stage?.style.setProperty('--hero-copy-offset', `${-12 * copyExit}px`);
      document.documentElement.style.setProperty('--cinematic-nav-logo-opacity', String(logoHandoff));

      const nextNarrativeIndex = narrativeIndexFor(progress);
      if (nextNarrativeIndex !== narrativeIndexRef.current) {
        narrativeIndexRef.current = nextNarrativeIndex;
        setNarrativeIndex(nextNarrativeIndex);
      }

      if (!playbackEnabledRef.current || renderSceneRef.current) return;
      desiredFrame = reducedMotionRef.current ? 0 : Math.round(progress * (FRAME_COUNT - 1));

      const readyBitmap = bitmaps.get(desiredFrame);
      if (readyBitmap) {
        if (desiredFrame !== decodedFrame) drawBitmap(desiredFrame, readyBitmap);
        if (!reducedMotionRef.current) schedulePrefetch();
        return;
      }

      drawNearestCached(desiredFrame);
      if (failedFrames.has(desiredFrame)) {
        setFrameError(true);
        return;
      }
      if (!decodeInProgress) {
        decodeInProgress = true;
        const requestedIndex = desiredFrame;
        loadBitmap(requestedIndex)
          .then((bitmap) => {
            if (active && bitmap && desiredFrame === requestedIndex) drawBitmap(requestedIndex, bitmap);
            requestUpdate();
          })
          .catch((error) => {
            if (error.name !== 'AbortError' && active) setFrameError(true);
            requestUpdate();
          })
          .finally(() => {
            decodeInProgress = false;
            if (active) requestUpdate();
          });
      }
    }

    function cancelPrefetch() {
      if (prefetchHandle === null) return;
      if (prefetchUsesTimeout) window.clearTimeout(prefetchHandle);
      else window.cancelIdleCallback?.(prefetchHandle);
      prefetchHandle = null;
    }

    requestUpdateRef.current = requestUpdate;
    introFrame = window.requestAnimationFrame(() => {
      stage?.setAttribute('data-intro-ready', 'true');
    });
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestUpdate();

    return () => {
      active = false;
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (introFrame !== null) window.cancelAnimationFrame(introFrame);
      cancelPrefetch();
      abortController.abort();
      bitmaps.forEach((bitmap) => bitmap.close?.());
      bitmaps.clear();
      blobs.clear();
      blobRequests.clear();
      stage?.removeAttribute('data-intro-ready');
      stage?.style.removeProperty('--scene-progress');
      stage?.style.removeProperty('--hero-logo-opacity');
      stage?.style.removeProperty('--hero-logo-scale');
      stage?.style.removeProperty('--hero-copy-opacity');
      stage?.style.removeProperty('--hero-copy-offset');
      document.documentElement.style.removeProperty('--cinematic-nav-logo-opacity');
      requestUpdateRef.current = null;
    };
  }, []);

  useEffect(() => {
    requestUpdateRef.current?.();
  }, [playbackEnabled, renderScene, reducedMotion]);

  const narrative = NARRATIVE[narrativeIndex];

  return (
    <section ref={sectionRef} id="experience" className="cinematic-journey" aria-label="A journey through the restaurant">
      <div ref={stageRef} className="cinematic-stage">
        <div className="cinematic-scene-slot">
          {renderScene ? renderScene({ reducedMotion, playbackEnabled, progressRef }) : (
            <canvas
              ref={canvasRef}
              className="cinematic-canvas"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="cinematic-shade" />
        <BrandAnimation
          ref={logoAnimationRef}
          className="cinematic-brand-animation"
          reducedMotion={reducedMotion}
          onError={() => setLogoFrameError(true)}
        />
        <div className="cinematic-copy">
          <div className="cinematic-copy-inner">
            <p className="eyebrow">{narrative.eyebrow}</p>
            <h1 className="cinematic-line">
              <span className="sr-only">{narrative.lines.join(' ')}</span>
              <span aria-hidden="true">
                {narrative.lines.map((line) => <span key={line} className="cinematic-title-line">{line}</span>)}
              </span>
            </h1>
            <p className="cinematic-caption">A considered welcome begins with a clear view of the room.</p>
          </div>
        </div>
        {!renderScene && !frameReady && !frameError && <p className="video-status" role="status">Preparing the dining room</p>}
        {!renderScene && frameError && <p className="video-status" role="status">Some restaurant frames are unavailable. Showing the nearest available scene.</p>}
        {logoFrameError && <p className="video-status logo-frame-status" role="status">Some logo animation frames are unavailable.</p>}
        {!renderScene && reducedMotion && <p className="video-status" role="status">Reduced motion is on. The opening scene is held still.</p>}
      </div>
    </section>
  );
}

export default CinematicScene;
