import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Card } from '@prisma/client';
import type { CanvasDesign, CardResponse } from '@occasio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardBody } from './dto/create-card.dto';

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
