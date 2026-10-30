import {
  Body,
  Controller,
  Delete,
  NotFoundException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { CardResponse } from '@occasio/shared';
import { CardsService } from './cards.service';
import { CreateCardBody } from './dto/create-card.dto';
import { UpdateCardBody } from './dto/update-card.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateCardBody,
  ): Promise<CardResponse> {
    return this.cards.create(user.userId, body);
  }

  @Post('dev/failed')
  createFailedDemo(@CurrentUser() user: AuthedUser): Promise<CardResponse> {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    return this.cards.createFailedDemo(user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthedUser): Promise<CardResponse[]> {
    return this.cards.findAll(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
  ): Promise<CardResponse> {
    return this.cards.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() body: UpdateCardBody,
  ): Promise<CardResponse> {
    return this.cards.update(user.userId, id, body);
  }

  @Post(':id/retry')
  retry(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
  ): Promise<CardResponse> {
    return this.cards.retry(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.cards.remove(user.userId, id);
  }
}
