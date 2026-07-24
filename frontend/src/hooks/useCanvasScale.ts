import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Fits a fixed-size design (designWidth × designHeight) into whatever space its
 * container offers, preserving aspect ratio and never upscaling past 1:1. The
 * design keeps its fixed logical coordinates; only the on-screen scale changes,
 * so the canvas stays responsive without scrolling or distortion.
 *
 * Attach `ref` to the (padded) container to measure; feed `scale` to
 * CanvasRenderer. Observing the container's content box avoids a feedback loop
 * because the container is sized by layout, not by the scaled canvas.
 */
export function useCanvasScale(designWidth: number, designHeight: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      const next = Math.min(width / designWidth, height / designHeight, 1);
      if (Number.isFinite(next) && next > 0) setScale(next);
    };

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      fit(cr.width, cr.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth, designHeight]);

  return { ref, scale };
}
