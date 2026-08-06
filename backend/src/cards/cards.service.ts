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

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: CreateCardBody): Promise<CardResponse> {
    const card = await this.prisma.card.create({
      data: {
        recipient: body.recipient,
        sendAt: new Date(body.sendAt),
        design: body.design as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toResponse(card);
  }

  async findAll(): Promise<CardResponse[]> {
    const cards = await this.prisma.card.findMany({
      orderBy: { sendAt: 'asc' },
    });
    return cards.map((c) => this.toResponse(c));
  }

  async findOne(id: string): Promise<CardResponse> {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    return this.toResponse(card);
  }

  /** Edit a still-PENDING card (recipient / sendAt / design). */
  async update(id: string, body: UpdateCardBody): Promise<CardResponse> {
    const card = await this.prisma.card.findUnique({ where: { id } });
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
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.card.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Card ${id} not found`);
    }
  }

  /** Re-queue a FAILED card so the scheduler picks it up again. */
  async retry(id: string): Promise<CardResponse> {
    const card = await this.prisma.card.findUnique({ where: { id } });
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

  /** Cards whose time has come and are still waiting to be sent. */
  async findDue(now: Date, take = 25): Promise<Card[]> {
    return this.prisma.card.findMany({
      where: { status: 'PENDING', sendAt: { lte: now } },
      orderBy: { sendAt: 'asc' },
      take,
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
