import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { QueueModule } from './queue/queue.module';
import { RenderModule } from './render/render.module';
import { MailModule } from './mail/mail.module';

// In production the backend also serves the built SPA (single service), so
// Playwright can render against http://localhost:$PORT/render. Only enabled when
// the build is present (absent in local dev, where Vite serves the frontend).
const frontendDist =
  process.env.FRONTEND_DIST ?? join(__dirname, '..', '..', 'frontend', 'dist');
const staticImports = existsSync(frontendDist)
  ? [
      ServeStaticModule.forRoot({
        rootPath: frontendDist,
        exclude: ['/api/{*path}'],
      }),
    ]
  : [];

@Module({
  imports: [
    ...staticImports,
    PrismaModule,
    AuthModule,
    CardsModule,
    QueueModule,
    RenderModule,
    MailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
