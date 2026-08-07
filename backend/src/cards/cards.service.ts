import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { Prisma, Card } from '@prisma/client';
import type { CanvasDesign, CardResponse } from '@occasio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardBody } from './dto/create-card.dto';
import { UpdateCardBody } from './dto/update-card.dto';

/** A due card joined with its owner (whose email is the sender). */
export type DueCard = Card & { user: { email: string } };

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, body: CreateCardBody): Promise<CardResponse> {
    const card = await this.prisma.card.create({
      data: {
        userId,
        recipient: body.recipient,
        sendAt: new Date(body.sendAt),
        design: body.design as unknown as Prisma.InputJsonValue,
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

  /** Edit a still-PENDING card (recipient / sendAt / design). */
  async update(
    userId: string,
    id: string,
    body: UpdateCardBody,
  ): Promise<CardResponse> {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    if (card.status !== 'PENDING') {
      throw new ConflictException(`Only PENDING cards can be edited`);
    }
    const updated = await this.prisma.card.update({
      where: { id },
      data: {
        ...(body.recipient !== undefined && { recipient: body.recipient }),
        ...(body.sendAt !== undefined && { sendAt: new Date(body.sendAt) }),
        ...(body.design !== undefined && {
          design: body.design as unknown as Prisma.InputJsonValue,
        }),
      },
    });
    return this.toResponse(updated);
  }

  /** Cancel a card (removes it). */
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.card.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException(`Card ${id} not found`);
  }

  /** Re-queue a FAILED card so the scheduler picks it up again. */
  async retry(userId: string, id: string): Promise<CardResponse> {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    if (card.status !== 'FAILED') {
      throw new ConflictException(`Only FAILED cards can be retried`);
    }
    const updated = await this.prisma.card.update({
      where: { id },
      data: { status: 'PENDING', error: null },
    });
    return this.toResponse(updated);
  }

  /** Due PENDING cards across all users, joined with the owner for the sender. */
  async findDue(now: Date, take = 25): Promise<DueCard[]> {
    return this.prisma.card.findMany({
      where: { status: 'PENDING', sendAt: { lte: now } },
      orderBy: { sendAt: 'asc' },
      take,
      include: { user: { select: { email: true } } },
    });
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.card.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), error: null },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.card.update({
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
    };
  }
}
