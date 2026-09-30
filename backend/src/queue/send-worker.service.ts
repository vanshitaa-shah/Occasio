import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { CardsService } from '../cards/cards.service';
import { RenderService } from '../render/render.service';
import { MailService } from '../mail/mail.service';
import {
  CARD_SEND_QUEUE,
  createRedisConnection,
  type SendJobData,
} from './queue.constants';

const CARD_SUBJECT = 'You have a card 🎉';
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Consumes the `card-send` queue and runs the render → mail → markSent
 * pipeline. Concurrency lets many cards send in parallel (bounded so the
 * headless renderer isn't overwhelmed). BullMQ handles retry/backoff; a card is
 * marked FAILED only once its attempts are exhausted.
 */
@Injectable()
export class SendWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SendWorkerService.name);
  private readonly connection: Redis = createRedisConnection();
  private readonly concurrency = Number(
    process.env.SEND_WORKER_CONCURRENCY ?? DEFAULT_CONCURRENCY,
  );
  private readonly maxAttempts = Number(
    process.env.SEND_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS,
  );
  private worker: Worker<SendJobData> | null = null;

  constructor(
    private readonly cards: CardsService,
    private readonly render: RenderService,
    private readonly mail: MailService,
  ) {}

  onApplicationBootstrap(): void {
    this.worker = new Worker<SendJobData>(
      CARD_SEND_QUEUE,
      (job) => this.process(job),
      { connection: this.connection, concurrency: this.concurrency },
    );
    this.worker.on('error', (err) =>
      this.logger.error(`Worker error: ${err.message}`),
    );
    this.logger.log(`Send worker started (concurrency ${this.concurrency})`);
  }

  private async process(job: Job<SendJobData>): Promise<void> {
    const { cardId } = job.data;
    const card = await this.cards.findForSend(cardId);
    // Card was deleted (cancelled) before its job ran — nothing to do.
    if (!card) return;

    // Atomically claim it (PENDING/SENDING → SENDING). count === 0 means it was
    // already sent or cancelled by another worker/instance — the double-send guard.
    const claimed = await this.cards.markSending(cardId);
    if (!claimed) return;

    try {
      const png = await this.render.render(
        this.cards.designOf(card),
        card.user.email,
      );
      await this.mail.sendCard({
        to: card.recipient,
        replyTo: card.user.email,
        subject: CARD_SUBJECT,
        png,
      });
      await this.cards.markSent(cardId);
      this.logger.log(
        `Sent card ${cardId}: ${card.user.email} → ${card.recipient}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const attemptsAllowed = job.opts.attempts ?? this.maxAttempts;
      const isFinalAttempt = job.attemptsMade + 1 >= attemptsAllowed;
      if (isFinalAttempt) {
        await this.cards.markFailed(cardId, msg);
        this.logger.error(`Failed card ${cardId} (final): ${msg}`);
      } else {
        this.logger.warn(
          `Send attempt ${job.attemptsMade + 1}/${attemptsAllowed} for card ${cardId} failed: ${msg}`,
        );
      }
      // Rethrow so BullMQ schedules the exponential-backoff retry.
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
