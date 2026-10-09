import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { env } from './env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Responses are per-browser, so a shared cache must neither store nor reuse them.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });

  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
await bootstrap();
