/// <reference types="vite/client" />

interface Window {
  /** Set by RenderPage once the canvas has painted; the Phase 3 headless
   * renderer waits on this before screenshotting. */
  __OCCASIO_READY__?: boolean;
}
