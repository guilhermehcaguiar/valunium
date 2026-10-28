import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { ENVIRONMENT } from './environment.token';
import type { Environment } from '../config/environment';

@Injectable()
export class Database implements OnModuleDestroy {
  private instance: PrismaClient | undefined;
  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {}
  get client(): PrismaClient {
    if (!this.environment.databaseUrl) throw new ServiceUnavailableException();
    return this.instance ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: this.environment.databaseUrl, options: '-c timezone=UTC' }) });
  }
  async onModuleDestroy(): Promise<void> { await this.instance?.$disconnect(); }
}
