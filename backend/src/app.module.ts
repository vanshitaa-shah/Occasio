import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CardsModule } from './cards/cards.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RenderModule } from './render/render.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    CardsModule,
    SchedulerModule,
    RenderModule,
    MailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
