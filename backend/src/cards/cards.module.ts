import { Module, forwardRef } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AuthModule, forwardRef(() => QueueModule)],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
