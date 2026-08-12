import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, type Browser } from 'playwright';
import type { CanvasDesign } from '@occasio/shared';

const READY_TIMEOUT_MS = 15_000;

/**
 * Turns a CanvasDesign into a PNG. Playwright headless Chromium loads the
 * frontend's /render route (which rebuilds the exact Konva scene via the shared
 * CanvasRenderer) and screenshots the canvas — guaranteeing the email image
 * matches the UI. One browser is reused across renders; each job gets its own
 * context for isolation.
 */
@Injectable()
export class RenderService implements OnModuleDestroy {
  private readonly logger = new Logger(RenderService.name);
  // In prod (single service) the SPA is served by this same process, so we
  // render against ourselves; RENDER_BASE_URL overrides (e.g. Vite in dev).
  private readonly baseUrl =
    process.env.RENDER_BASE_URL ??
    `http://localhost:${process.env.PORT ?? 3001}`;
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      // --no-sandbox is required to run Chromium as root in a container.
      this.browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  /** Render a design to a PNG buffer at 2× for a crisp email image. */
  async render(design: CanvasDesign, sentBy?: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: design.width, height: design.height },
      deviceScaleFactor: 2,
    });
    try {
      const page = await context.newPage();
      const sentByParam = sentBy
        ? `&sentBy=${encodeURIComponent(sentBy)}`
        : '';
      const url = `${this.baseUrl}/render?design=${encodeURIComponent(
        JSON.stringify(design),
      )}${sentByParam}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction('window.__OCCASIO_READY__ === true', {
        timeout: READY_TIMEOUT_MS,
      });
      const canvas = page.locator('#occasio-render-root canvas').first();
      return await canvas.screenshot({ type: 'png' });
    } finally {
      await context.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
  }
}
