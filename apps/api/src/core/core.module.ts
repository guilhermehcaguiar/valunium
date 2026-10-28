import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { Database } from './database';
import { MailDelivery } from './mail';
import { ENVIRONMENT } from './environment.token';
import type { Environment } from '../config/environment';

@Global()
@Module({})
export class CoreModule {
  static register(environment: Environment): DynamicModule {
    return { module: CoreModule, providers: [{ provide: ENVIRONMENT, useValue: environment }, Database, MailDelivery],
      exports: [ENVIRONMENT, Database, MailDelivery] };
  }
}
