import { Module, forwardRef } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module';
import { RenderModule } from '../render/render.module';
import { MailModule } from '../mail/mail.module';
import { CardQueueService } from './card-queue.service';
import { SendWorkerService } from './send-worker.service';
import { ReconcilerService } from './reconciler.service';

/**
 * The v2 send pipeline: a durable BullMQ queue (CardQueueService), the worker
 * that drains it (SendWorkerService), and a reconciler safety net. Exports the
 * queue so CardsModule can enqueue on create/edit/cancel/retry.
 */
@Module({
  imports: [forwardRef(() => CardsModule), RenderModule, MailModule],
  providers: [CardQueueService, SendWorkerService, ReconcilerService],
  exports: [CardQueueService],
})
export class QueueModule {}
