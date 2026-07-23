import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module';
import { RenderModule } from '../render/render.module';
import { MailModule } from '../mail/mail.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [CardsModule, RenderModule, MailModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
