import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import './auth/types';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { readEnvironment } from './config/environment';
import type { Environment } from './config/environment';

export async function createApplication(environment: Environment = readEnvironment(), logging = true) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(environment), {
    logger: logging ? ['log', 'warn', 'error'] : false,
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '16kb' });
  app.disable('x-powered-by');
  if (environment.nodeEnv === 'production') app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.locals.requestId = randomUUID();
    response.setHeader('X-Request-Id', response.locals.requestId as string);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  if (environment.databaseUrl && environment.sessionSecret) {
    const pool = new Pool({ connectionString: environment.databaseUrl, options: '-c timezone=UTC' });
    const Store = connectPgSimple(session);
    const store = new Store({ pool, tableName: 'Session', createTableIfMissing: false, pruneSessionInterval: 60,
      disableTouch: true, errorLog: () => { /* Never expose driver errors or URLs. */ } });
    app.use(session({ store, name: 'valunium.sid', secret: environment.sessionSecret,
      resave: false, saveUninitialized: false, rolling: false, unset: 'destroy',
      cookie: { httpOnly: true, secure: environment.nodeEnv === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60_000 } }));
    // Both pools are explicitly closed by Nest/application shutdown.
    const close = app.close.bind(app);
    app.close = async () => { store.close(); await close(); await pool.end(); };
  }
  app.enableCors({ origin: environment.corsOrigins, credentials: true, methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
