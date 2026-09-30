import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CardsService } from '../cards/cards.service';
import { CardQueueService } from './card-queue.service';

/**
 * Abstraction over "make sure due cards get dispatched". v1 was a polling
 * SchedulerService; v2's primary path is BullMQ delayed jobs, and this
 * reconciler is the durable safety net satisfying the same contract.
 */
export interface CardScheduler {
  start(): void;
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 300_000; // 5 min
const DEFAULT_LOOKAHEAD_MS = 120_000; // 2 min

/**
 * Safety net, NOT the primary dispatch path. Delayed jobs live in Redis and
 * normally fire on their own. This sweep re-enqueues PENDING cards that are due
 * soon but have no queue job — covering jobs lost to a Redis restart (free-tier
 * Redis has no persistence), cards created while Redis was down, and pre-v2
 * rows created before the queue existed. On boot it also seeds jobs for every
 * outstanding PENDING card.
 */
@Injectable()
export class ReconcilerService
  implements CardScheduler, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ReconcilerService.name);
  private readonly intervalMs = Number(
    process.env.RECONCILE_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
  );
  private readonly lookaheadMs = Number(
    process.env.RECONCILE_LOOKAHEAD_MS ?? DEFAULT_LOOKAHEAD_MS,
  );
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly cards: CardsService,
    private readonly queue: CardQueueService,
  ) {}

  onApplicationBootstrap(): void {
    // Seed everything outstanding on boot, then start the periodic sweep.
    void this.sweep(true).finally(() => this.start());
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.sweep(false), this.intervalMs);
    this.logger.log(`Reconciler started (every ${this.intervalMs / 1000}s)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * @param seedAll on boot, enqueue every PENDING card regardless of sendAt;
   * otherwise only those due within the lookahead window.
   */
  private async sweep(seedAll: boolean): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const before = seedAll
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // ~100y — all PENDING
        : new Date(Date.now() + this.lookaheadMs);
      const due = await this.cards.findPendingDueSoon(before);
      let requeued = 0;
      for (const card of due) {
        if (!(await this.queue.has(card.id))) {
          await this.queue.enqueue(card);
          requeued++;
        }
      }
      if (requeued > 0) {
        this.logger.log(`Reconciler re-enqueued ${requeued} card(s)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Reconciler sweep failed: ${msg}`);
    } finally {
      this.running = false;
    }
  }
}
