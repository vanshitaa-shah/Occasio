import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { CardResponse } from '@occasio/shared';
import { CardsService } from './cards.service';
import { CreateCardBody } from './dto/create-card.dto';
import { UpdateCardBody } from './dto/update-card.dto';

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

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateCardBody,
  ): Promise<CardResponse> {
    return this.cards.update(id, body);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string): Promise<CardResponse> {
    return this.cards.retry(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.cards.remove(id);
  }
}
