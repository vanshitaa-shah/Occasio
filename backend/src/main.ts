import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All API routes live under /api; everything else is the served SPA (prod).
  app.setGlobalPrefix('api');
  // Frontend (Vite) runs on a different origin during dev.
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Occasio backend listening on http://localhost:${port}`);
}

void bootstrap();
