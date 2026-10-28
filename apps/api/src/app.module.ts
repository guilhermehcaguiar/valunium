import { AssetsModule } from './finance/assets';
import { TransactionsModule, IncomeEventsModule, PositionsModule } from './finance/modules';
import { DashboardModule } from './finance/dashboard';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.controller';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { CsrfGuard } from './auth/guards';
import type { Environment } from './config/environment';
@Module({})
export class AppModule {
  static register(environment: Environment): DynamicModule {
    return { module: AppModule,
      imports: [CoreModule.register(environment), HealthModule, AuthModule, UsersModule, PortfoliosModule, DashboardModule, AssetsModule, TransactionsModule, IncomeEventsModule, PositionsModule,
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: CsrfGuard }] };
  }
}
