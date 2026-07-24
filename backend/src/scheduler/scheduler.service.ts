import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CardsService } from '../cards/cards.service';
import { RenderService } from '../render/render.service';
import { MailService } from '../mail/mail.service';

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

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const CARD_SUBJECT = 'You have a card 🎉';

@Injectable()
export class SchedulerService
  implements CardScheduler, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SchedulerService.name);
  private readonly intervalMs = Number(
    process.env.SCHEDULER_POLL_MS ?? DEFAULT_POLL_INTERVAL_MS,
  );
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly cards: CardsService,
    private readonly render: RenderService,
    private readonly mail: MailService,
  ) {}

  onApplicationBootstrap(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.timer) return;
    this.logger.log(`Scheduler started (poll every ${this.intervalMs / 1000}s)`);
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * One poll cycle: find due PENDING cards, render each to a PNG, email it, and
   * mark SENT/FAILED. Sequential and guarded so a slow cycle can't overlap the
   * next. Retry/backoff on failure is a Phase 4 concern.
   */
  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.cards.findDue(new Date());
      if (due.length === 0) return;
      this.logger.log(`Dispatching ${due.length} due card(s)`);

      for (const card of due) {
        try {
          const png = await this.render.render(this.cards.designOf(card));
          await this.mail.sendCard({
            to: card.recipient,
            subject: CARD_SUBJECT,
            png,
          });
          await this.cards.markSent(card.id);
          this.logger.log(`Sent card ${card.id} → ${card.recipient}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await this.cards.markFailed(card.id, msg);
          this.logger.error(`Failed card ${card.id}: ${msg}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
