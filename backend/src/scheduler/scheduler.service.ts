import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';

/**
 * Abstraction over "run the send pipeline for cards whose time has come".
 *
 * v1 implementation (SchedulerService below) polls the DB on an interval.
 * A future Temporal-backed implementation can satisfy the same contract
 * (schedule a durable timer per card) with no change to callers.
 */
export interface CardScheduler {
  /** Start dispatching due cards. */
  start(): void;
  /** Stop dispatching (graceful shutdown). */
  stop(): void;
}

const POLL_INTERVAL_MS = 60_000;

@Injectable()
export class SchedulerService
  implements CardScheduler, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  onApplicationBootstrap(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.timer) return;
    this.logger.log(
      `Scheduler started (poll every ${POLL_INTERVAL_MS / 1000}s)`,
    );
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * One poll cycle. Phase 3 fills this in:
   *   1. find PENDING cards where sendAt <= now
   *   2. render each to PNG (RenderService)
   *   3. email it (MailService)
   *   4. mark SENT / FAILED
   */
  private async tick(): Promise<void> {
    // TODO(phase-3): query due cards and run the send pipeline.
  }
}
