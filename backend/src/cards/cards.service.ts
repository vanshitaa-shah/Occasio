import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, type Card, type CardStatus } from '@prisma/client';
import {
  createDefaultDesign,
  DEMO_RECIPIENT,
  type CanvasDesign,
  type CardResponse,
} from '@occasio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CardQueueService } from '../queue/card-queue.service';
import { CreateCardBody } from './dto/create-card.dto';
import { UpdateCardBody } from './dto/update-card.dto';

/** A due card joined with its owner (whose email is the sender). */
export type DueCard = Card & { user: { email: string } };

/** The columns read under a row lock (`SELECT … FOR UPDATE`). */
interface LockedCard {
  status: CardStatus;
  attempts: number;
  lastAttemptAt: Date | null;
}

/**
 * How long a SENDING claim is honoured before another worker may take the card
 * over (the claiming worker is presumed dead). Well above a render + send.
 */
const DEFAULT_SEND_LEASE_MS = 300_000;

@Injectable()
export class CardsService {
  private readonly leaseMs = Number(
    process.env.SEND_LEASE_MS ?? DEFAULT_SEND_LEASE_MS,
  );

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CardQueueService))
    private readonly queue: CardQueueService,
  ) {}

  async create(userId: string, body: CreateCardBody): Promise<CardResponse> {
    const card = await this.prisma.card.create({
      data: {
        userId,
        recipient: body.recipient,
        sendAt: new Date(body.sendAt),
        design: body.design as unknown as Prisma.InputJsonValue,
      },
    });
    await this.queue.enqueue(card);
    return this.toResponse(card);
  }

  async createFailedDemo(userId: string): Promise<CardResponse> {
    const design = createDefaultDesign();
    design.texts[0].text = 'Failed demo card';
    design.texts[1].text = 'Retry me';
    const card = await this.prisma.card.create({
      data: {
        userId,
        recipient: DEMO_RECIPIENT,
        sendAt: new Date(),
        design: design as unknown as Prisma.InputJsonValue,
        status: 'FAILED',
        error: 'Demo failure: simulated send error',
        attempts: 3,
        lastAttemptAt: new Date(),
      },
    });
    return this.toResponse(card);
  }

  async findAll(userId: string): Promise<CardResponse[]> {
    const cards = await this.prisma.card.findMany({
      where: { userId },
      orderBy: { sendAt: 'asc' },
    });
    return cards.map((c) => this.toResponse(c));
  }

  async findOne(userId: string, id: string): Promise<CardResponse> {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    return this.toResponse(card);
  }

  /**
   * Lock a card's row (`FOR UPDATE`) for the rest of the transaction, so a
   * concurrent edit / cancel / retry / worker claim waits instead of racing the
   * status check that follows. Scoped to the owner when `userId` is given.
   */
  private async lockCard(
    tx: Prisma.TransactionClient,
    id: string,
    userId?: string,
  ): Promise<LockedCard | null> {
    const owner = userId ? Prisma.sql`AND "userId" = ${userId}` : Prisma.empty;
    const rows = await tx.$queryRaw<LockedCard[]>`
      SELECT status, attempts, "lastAttemptAt" FROM "Card"
      WHERE id = ${id} ${owner} FOR UPDATE`;
    return rows[0] ?? null;
  }

  /** Edit a still-PENDING card (recipient / sendAt / design). */
  async update(
    userId: string,
    id: string,
    body: UpdateCardBody,
  ): Promise<CardResponse> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockCard(tx, id, userId);
      if (!locked) throw new NotFoundException(`Card ${id} not found`);
      if (locked.status !== 'PENDING') {
        throw new ConflictException(`Only PENDING cards can be edited`);
      }
      return tx.card.update({
        where: { id },
        data: {
          ...(body.recipient !== undefined && { recipient: body.recipient }),
          ...(body.sendAt !== undefined && { sendAt: new Date(body.sendAt) }),
          ...(body.design !== undefined && {
            design: body.design as unknown as Prisma.InputJsonValue,
          }),
        },
      });
    });
    // Queue (Redis) work happens after the DB commit — it can't join the
    // transaction. A changed send time needs the queued job moved; design /
    // recipient edits are read fresh by the worker at claim time.
    if (body.sendAt !== undefined) {
      await this.queue.reschedule(updated);
    }
    return this.toResponse(updated);
  }

  /** Cancel a card (removes it and its queued job). Not allowed mid-send. */
  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockCard(tx, id, userId);
      if (!locked) throw new NotFoundException(`Card ${id} not found`);
      if (locked.status === 'SENDING') {
        throw new ConflictException(
          `Card is being sent and can't be cancelled`,
        );
      }
      await tx.card.delete({ where: { id } });
    });
    await this.queue.remove(id);
  }

  /** Re-queue a FAILED card to send again immediately. */
  async retry(userId: string, id: string): Promise<CardResponse> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockCard(tx, id, userId);
      if (!locked) throw new NotFoundException(`Card ${id} not found`);
      if (locked.status !== 'FAILED') {
        throw new ConflictException(`Only FAILED cards can be retried`);
      }
      return tx.card.update({
        where: { id },
        data: {
          status: 'PENDING',
          error: null,
          attempts: 0,
          sendAt: new Date(),
        },
      });
    });
    await this.queue.enqueue(updated);
    return this.toResponse(updated);
  }

  /**
   * Cards the reconciler should make sure have a live job: PENDING cards due on
   * or before `before`, plus SENDING cards whose claim lease has expired (their
   * worker died mid-send), joined with the owner.
   */
  async findDispatchable(before: Date, take = 500): Promise<DueCard[]> {
    return this.prisma.card.findMany({
      where: {
        OR: [
          { status: 'PENDING', sendAt: { lte: before } },
          {
            status: 'SENDING',
            lastAttemptAt: { lt: new Date(Date.now() - this.leaseMs) },
          },
        ],
      },
      orderBy: { sendAt: 'asc' },
      take,
      include: { user: { select: { email: true } } },
    });
  }

  /**
   * Claim a card for sending under a row lock and return it *as of the claim*
   * (so an edit that committed first is what gets sent, and one that arrives
   * later is rejected as non-PENDING). Returns null when the card is gone, already
   * sent/failed, or held by another live run — the double-send guard.
   *
   * Claimable when PENDING; or SENDING and either this is the job's own retry
   * (`attempts === attemptsMade`, i.e. its previous attempt failed) or the
   * previous claim's lease expired. A redelivered "stalled" job whose first run
   * is still alive matches neither, so it is skipped.
   */
  async claimForSend(
    id: string,
    attemptsMade: number,
  ): Promise<DueCard | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockCard(tx, id);
      if (!locked) return null;
      const leaseExpired =
        locked.lastAttemptAt !== null &&
        locked.lastAttemptAt.getTime() < Date.now() - this.leaseMs;
      const claimable =
        locked.status === 'PENDING' ||
        (locked.status === 'SENDING' &&
          (locked.attempts === attemptsMade || leaseExpired));
      if (!claimable) return null;
      return tx.card.update({
        where: { id },
        data: {
          status: 'SENDING',
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
        include: { user: { select: { email: true } } },
      });
    });
  }

  async markSent(id: string): Promise<void> {
    // updateMany: a no-op (not a throw) if the card was deleted meanwhile.
    await this.prisma.card.updateMany({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), error: null },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.card.updateMany({
      where: { id },
      data: { status: 'FAILED', error: error.slice(0, 500) },
    });
  }

  /** The design JSON as its typed shape (Prisma stores it as opaque Json). */
  designOf(card: Card): CanvasDesign {
    return card.design as unknown as CanvasDesign;
  }

  private toResponse(card: Card): CardResponse {
    return {
      id: card.id,
      recipient: card.recipient,
      sendAt: card.sendAt.toISOString(),
      status: card.status,
      design: card.design as unknown as CanvasDesign,
      createdAt: card.createdAt.toISOString(),
      sentAt: card.sentAt ? card.sentAt.toISOString() : null,
      error: card.error,
      attempts: card.attempts,
    };
  }
}
