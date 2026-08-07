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
  private readonly baseUrl =
    process.env.RENDER_BASE_URL ?? 'http://localhost:5173';
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch();
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
