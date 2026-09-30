import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, type Browser } from 'playwright';
import type { CanvasDesign } from '@occasio/shared';

const READY_TIMEOUT_MS = 15_000;
const DEFAULT_RENDER_CONCURRENCY = 3;

/**
 * Turns a CanvasDesign into a PNG. Playwright headless Chromium loads the
 * frontend's /render route (which rebuilds the exact Konva scene via the shared
 * CanvasRenderer) and screenshots the canvas — guaranteeing the email image
 * matches the UI. One browser is reused across renders; each job gets its own
 * context for isolation. Concurrent renders are capped by a semaphore so the
 * parallel send worker can't spawn unbounded heavyweight Chromium contexts.
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

  // Bounded-concurrency gate: at most N renders run at once; the rest queue.
  private readonly maxConcurrency = Number(
    process.env.RENDER_CONCURRENCY ?? DEFAULT_RENDER_CONCURRENCY,
  );
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  private async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  private release(): void {
    this.active--;
    this.waiters.shift()?.();
  }

  private async getBrowser(): Promise<Browser> {
    // Relaunch if never started or the previous browser crashed/disconnected
    // (v1 reused a dead browser forever).
    if (!this.browser || !this.browser.isConnected()) {
      // --no-sandbox is required to run Chromium as root in a container.
      this.browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  /** Render a design to a PNG buffer at 2× for a crisp email image. */
  async render(design: CanvasDesign, sentBy?: string): Promise<Buffer> {
    await this.acquire();
    try {
      return await this.screenshot(design, sentBy);
    } catch (err) {
      // A disconnected browser throws on newContext; drop it and retry once so
      // a single crash doesn't fail an otherwise healthy card.
      if (this.browser && !this.browser.isConnected()) {
        this.logger.warn(
          'Browser disconnected mid-render; relaunching and retrying',
        );
        this.browser = null;
        return await this.screenshot(design, sentBy);
      }
      throw err;
    } finally {
      this.release();
    }
  }

  private async screenshot(
    design: CanvasDesign,
    sentBy?: string,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: design.width, height: design.height },
      deviceScaleFactor: 2,
    });
    try {
      const page = await context.newPage();
      const sentByParam = sentBy ? `&sentBy=${encodeURIComponent(sentBy)}` : '';
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
