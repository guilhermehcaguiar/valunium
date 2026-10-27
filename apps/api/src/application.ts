import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { readEnvironment } from './config/environment';
import type { Environment } from './config/environment';

export async function createApplication(environment: Environment = readEnvironment(), logging = true) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logging ? ['log', 'warn', 'error'] : false,
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '16kb' });
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.locals.requestId = randomUUID();
    response.setHeader('X-Request-Id', response.locals.requestId as string);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.enableCors({ origin: environment.corsOrigins, credentials: false, methods: ['GET', 'HEAD', 'OPTIONS'] });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
