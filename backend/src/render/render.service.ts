import { Injectable, Logger } from '@nestjs/common';
import type { CanvasDesign } from '@occasio/shared';

/**
 * Turns a CanvasDesign into a PNG. v1 uses Playwright headless Chromium to load
 * the frontend's /render route (which rebuilds the exact Konva scene) and
 * screenshots it — guaranteeing the email image matches the UI.
 *
 * Kept behind this single method so the mechanism (headless browser now,
 * node-canvas or a render microservice later) can change without callers caring.
 */
@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);

  /**
   * Render a design to a PNG buffer.
   * Phase 3 fills this in:
   *   - reuse one Playwright browser instance
   *   - browser.newContext() per job for isolation
   *   - navigate to `${RENDER_BASE_URL}/render` with the design
   *   - wait for the canvas "ready" signal, then screenshot
   */
  async render(_design: CanvasDesign): Promise<Buffer> {
    // TODO(phase-3): Playwright render pipeline.
    throw new Error('RenderService.render not implemented until Phase 3');
  }
}
