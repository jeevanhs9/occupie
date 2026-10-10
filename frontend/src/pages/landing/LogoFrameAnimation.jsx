import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const FRAME_COUNT = 120;
const FRAME_DIRECTORY = '/logo-animation-frames/';
const CACHE_LIMIT = 6;
// Measured from the alpha bounds of the complete logo/tagline in frames 93–119.
// A little breathing room keeps the outer mark shapes and tagline from clipping.
const COMPLETE_LOGO_CROP = { x: 530, y: 240, width: 860, height: 640 };
const CROP_START_FRAME = 72;
const CROP_COMPLETE_FRAME = 100;

const framePath = (index) => `${FRAME_DIRECTORY}frame_${String(index).padStart(4, '0')}.png`;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

/**
 * Draws the supplied Occupie logo clip as a scroll-addressable image sequence.
 * The source has a solid white background, so the checked-in sequence uses a
 * gentle white key and real PNG alpha to let the restaurant scene show through.
 */
export const LogoFrameAnimation = forwardRef(function LogoFrameAnimation(
  { className = '', reducedMotion = false, onError },
  forwardedRef,
) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useImperativeHandle(forwardedRef, () => ({
    render: (progress) => rendererRef.current?.(progress),
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (typeof window.CanvasRenderingContext2D === 'undefined') return undefined;
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !context || reducedMotion) return undefined;

    const controller = new AbortController();
    const bitmaps = new Map();
    const requests = new Map();
    const bitmapRequests = new Map();
    const prefetched = new Set();
    const failed = new Set();
    let active = true;
    let desiredFrame = 0;
    let lastProgress = 0;
    let decodedFrame = -1;
    let prefetchIndex = 3;
    let prefetchHandle = null;
    let prefetchIsTimeout = false;
    let drawingWidth = 0;
    let drawingHeight = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / Math.max(rect.width, 1), 1080 / Math.max(rect.height, 1));
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (width === canvas.width && height === canvas.height) return;
      canvas.width = width;
      canvas.height = height;
      drawingWidth = width;
      drawingHeight = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      decodedFrame = -1;
    };

    const drawFrame = (index, bitmap) => {
      resizeCanvas();

      // The source sequence is 16:9 with the actual logo occupying only its
      // center. Ease into the measured transparent bounds as the mark forms,
      // then keep a fixed crop so the completed wordmark never jumps in size.
      const cropProgress = clamp01((index - CROP_START_FRAME) / (CROP_COMPLETE_FRAME - CROP_START_FRAME));
      const easedCropProgress = cropProgress * cropProgress * (3 - (2 * cropProgress));
      const sourceX = COMPLETE_LOGO_CROP.x * easedCropProgress;
      const sourceY = COMPLETE_LOGO_CROP.y * easedCropProgress;
      const sourceWidth = bitmap.width + ((COMPLETE_LOGO_CROP.width - bitmap.width) * easedCropProgress);
      const sourceHeight = bitmap.height + ((COMPLETE_LOGO_CROP.height - bitmap.height) * easedCropProgress);
      const scale = Math.min(drawingWidth / sourceWidth, drawingHeight / sourceHeight);
      const width = sourceWidth * scale;
      const height = sourceHeight * scale;
      context.clearRect(0, 0, drawingWidth, drawingHeight);
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        (drawingWidth - width) / 2,
        (drawingHeight - height) / 2,
        width,
        height,
      );
      canvas.dataset.frameIndex = String(index).padStart(4, '0');
      decodedFrame = index;
    };

    const trimCache = () => {
      while (bitmaps.size > CACHE_LIMIT) {
        const [oldIndex, oldBitmap] = bitmaps.entries().next().value;
        bitmaps.delete(oldIndex);
        oldBitmap.close?.();
      }
    };

    const fetchBlob = (index) => {
      if (requests.has(index)) return requests.get(index);
      const request = fetch(framePath(index), { signal: controller.signal, cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`Logo frame ${index} returned ${response.status}`);
          return response.blob();
        })
        .finally(() => requests.delete(index));
      requests.set(index, request);
      return request;
    };

    const decodeImage = (blob) => new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);
      image.decoding = 'async';
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('The browser could not decode a logo frame.'));
      };
      image.src = objectUrl;
    });

    const loadBitmap = async (index) => {
      if (bitmaps.has(index)) {
        const cached = bitmaps.get(index);
        bitmaps.delete(index);
        bitmaps.set(index, cached);
        return cached;
      }
      if (bitmapRequests.has(index)) return bitmapRequests.get(index);
      const request = (async () => {
        const blob = await fetchBlob(index);
        const bitmap = window.createImageBitmap
          ? await window.createImageBitmap(blob)
          : await decodeImage(blob);
        if (!active) {
          bitmap.close?.();
          return null;
        }
        bitmaps.set(index, bitmap);
        trimCache();
        return bitmap;
      })().finally(() => bitmapRequests.delete(index));
      bitmapRequests.set(index, request);
      return request;
    };

    const drawNearestCached = (target) => {
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      bitmaps.forEach((bitmap, index) => {
        const distance = Math.abs(index - target);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      });
      if (nearestIndex >= 0 && nearestIndex !== decodedFrame) drawFrame(nearestIndex, bitmaps.get(nearestIndex));
    };

    const prefetchFrame = async (index) => {
      if (prefetched.has(index) || failed.has(index)) return;
      try {
        await fetchBlob(index);
        prefetched.add(index);
      } catch (error) {
        if (error.name !== 'AbortError' && active) {
          failed.add(index);
          errorRef.current?.(error);
        }
      }
    };

    const cancelPrefetch = () => {
      if (prefetchHandle === null) return;
      if (prefetchIsTimeout) window.clearTimeout(prefetchHandle);
      else window.cancelIdleCallback?.(prefetchHandle);
      prefetchHandle = null;
    };

    const schedulePrefetch = () => {
      if (!active || prefetchHandle !== null || prefetchIndex >= FRAME_COUNT) return;
      const runChunk = async () => {
        prefetchHandle = null;
        if (!active) return;
        const end = Math.min(prefetchIndex + 3, FRAME_COUNT);
        const batch = [];
        for (let index = prefetchIndex; index < end; index += 1) batch.push(prefetchFrame(index));
        prefetchIndex = end;
        await Promise.all(batch);
        schedulePrefetch();
      };
      if ('requestIdleCallback' in window) {
        prefetchIsTimeout = false;
        prefetchHandle = window.requestIdleCallback(runChunk, { timeout: 1200 });
      } else {
        prefetchIsTimeout = true;
        prefetchHandle = window.setTimeout(runChunk, 250);
      }
    };

    const render = (progress) => {
      lastProgress = clamp01(progress);
      desiredFrame = Math.round(lastProgress * (FRAME_COUNT - 1));
      resizeCanvas();

      const ready = bitmaps.get(desiredFrame);
      if (ready) {
        if (desiredFrame !== decodedFrame) drawFrame(desiredFrame, ready);
        return;
      }

      drawNearestCached(desiredFrame);
      if (failed.has(desiredFrame) || bitmapRequests.has(desiredFrame)) return;
      const requestedFrame = desiredFrame;
      loadBitmap(requestedFrame)
        .then((bitmap) => {
          if (active && bitmap && desiredFrame === requestedFrame) drawFrame(requestedFrame, bitmap);
        })
        .catch((error) => {
          if (error.name !== 'AbortError' && active) {
            failed.add(requestedFrame);
            errorRef.current?.(error);
          }
        });
    };

    rendererRef.current = render;
    // Make the opening frame available first; later frames load during idle time.
    render(0);
    loadBitmap(0).then((bitmap) => {
      if (active && bitmap && desiredFrame === 0) drawFrame(0, bitmap);
      schedulePrefetch();
    }).catch((error) => {
      if (error.name !== 'AbortError' && active) {
        failed.add(0);
        errorRef.current?.(error);
      }
      schedulePrefetch();
    });
    prefetchFrame(1);
    prefetchFrame(2);

    return () => {
      active = false;
      rendererRef.current = null;
      cancelPrefetch();
      controller.abort();
      bitmaps.forEach((bitmap) => bitmap.close?.());
      bitmaps.clear();
      requests.clear();
      bitmapRequests.clear();
      prefetched.clear();
    };
  }, [reducedMotion]);

  return (
    <div className={`${className} logo-frame-animation`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="logo-frame-canvas" />
    </div>
  );
});

export default LogoFrameAnimation;
