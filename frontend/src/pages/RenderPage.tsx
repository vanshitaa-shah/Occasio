import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CanvasDesign } from '@occasio/shared';
import { CanvasRenderer } from '../components/CanvasRenderer';

/**
 * Headless-render target. Playwright navigates here at send time (Phase 3) with
 * the design in the URL, this page rebuilds the exact same Konva scene via the
 * shared CanvasRenderer, and once painted it sets `window.__OCCASIO_READY__`
 * so the screenshot captures a fully-rendered canvas.
 */
export function RenderPage() {
  const [params] = useSearchParams();
  const raw = params.get('design');

  let design: CanvasDesign | null = null;
  if (raw) {
    try {
      design = JSON.parse(raw) as CanvasDesign;
    } catch {
      design = null;
    }
  }

  const handleReady = useCallback(() => {
    window.__OCCASIO_READY__ = true;
  }, []);

  if (!design) {
    return <div id="occasio-render-root">No design provided.</div>;
  }

  return (
    <div
      id="occasio-render-root"
      style={{ width: design.width, height: design.height }}
    >
      <CanvasRenderer design={design} onReady={handleReady} />
    </div>
  );
}
