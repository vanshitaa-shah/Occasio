import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CardResponse } from '@occasio/shared';
import { CardsService } from './cards.service';
import { CreateCardBody } from './dto/create-card.dto';

@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post()
  create(@Body() body: CreateCardBody): Promise<CardResponse> {
    return this.cards.create(body);
  }

  @Get()
  findAll(): Promise<CardResponse[]> {
    return this.cards.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CardResponse> {
    return this.cards.findOne(id);
  }
}
