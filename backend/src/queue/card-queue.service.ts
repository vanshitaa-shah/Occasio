import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Card } from '@prisma/client';
import {
  CARD_SEND_QUEUE,
  SEND_JOB,
  createRedisConnection,
  type SendJobData,
} from './queue.constants';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 30_000;
const FINISHED_STATES = new Set(['failed', 'completed']);

/**
 * The enqueue seam. Owns the BullMQ `card-send` queue and turns card lifecycle
 * events into durable delayed jobs: one job per card, `jobId = card.id`, firing
 * at `sendAt`. Using the card id as the job id makes enqueue/reschedule/remove
 * idempotent — there is never more than one live job per card.
 */
@Injectable()
export class CardQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(CardQueueService.name);
  private readonly connection: Redis = createRedisConnection();
  private readonly maxAttempts = Number(
    process.env.SEND_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS,
  );
  private readonly backoffMs = Number(
    process.env.SEND_BACKOFF_MS ?? DEFAULT_BACKOFF_MS,
  );
  readonly queue = new Queue<SendJobData>(CARD_SEND_QUEUE, {
    connection: this.connection,
  });

  /** Schedule a card to send at its `sendAt` (immediately if already due). */
  async enqueue(card: Pick<Card, 'id' | 'sendAt'>): Promise<void> {
    // BullMQ silently ignores `add()` while a job with the same id still exists,
    // and finished jobs are retained (removeOnFail). Clear a finished one first,
    // otherwise a retried card would never get a live job.
    const existing = await this.queue.getJob(card.id);
    if (existing && FINISHED_STATES.has(await existing.getState())) {
      await existing.remove().catch(() => undefined);
    }
    const delay = Math.max(0, card.sendAt.getTime() - Date.now());
    await this.queue.add(
      SEND_JOB,
      { cardId: card.id },
      {
        jobId: card.id,
        delay,
        attempts: this.maxAttempts,
        backoff: { type: 'exponential', delay: this.backoffMs },
        removeOnComplete: true,
        // Keep the last 100 failed jobs for debugging; older ones are trimmed.
        removeOnFail: 100,
      },
    );
    this.logger.log(
      `Enqueued card ${card.id} (delay ${Math.round(delay / 1000)}s)`,
    );
  }

  /** Remove the card's job (if any) and re-add it — for a changed `sendAt`. */
  async reschedule(card: Pick<Card, 'id' | 'sendAt'>): Promise<void> {
    await this.remove(card.id);
    await this.enqueue(card);
  }

  /** Remove a card's pending job. No-op if it has already run or never existed. */
  async remove(cardId: string): Promise<void> {
    const job = await this.queue.getJob(cardId);
    // A job that is already active/completed can't be removed mid-flight; ignore.
    await job?.remove().catch(() => undefined);
  }

  /**
   * Whether a live (not yet finished) job exists for this card — used by the
   * reconciler. A retained failed/completed job doesn't count: it will never run.
   */
  async has(cardId: string): Promise<boolean> {
    const job = await this.queue.getJob(cardId);
    if (!job) return false;
    return !FINISHED_STATES.has(await job.getState());
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
