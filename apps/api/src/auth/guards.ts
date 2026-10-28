import type { AuthIdentity } from './types';
import { Inject, Injectable, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Database } from '../core/database';
import { ENVIRONMENT } from '../core/environment.token';
import type { Environment } from '../config/environment';
import { AuthService, publicUserSelect } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) { super({ usernameField: 'email' }); }
  validate(email: string, password: string): Promise<AuthIdentity> {
    // Passport guards run before Nest DTO pipes. Validate/normalize here as well.
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length < 12 || password.length > 128) {
      throw new UnauthorizedException();
    }
    return this.auth.validate(email.trim().toLowerCase(), password);
  }
}
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly db: Database) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;
    if (!session?.userId || typeof session.authVersion !== 'number') throw new UnauthorizedException();
    const user = await this.db.client.user.findUnique({ where: { id: session.userId }, select: { ...publicUserSelect, authVersion: true } });
    if (!user || user.authVersion !== session.authVersion) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (!request.session) throw new ServiceUnavailableException();
    const origin = request.get('origin');
    const token = request.get('x-csrf-token');
    const expected = request.session.csrfToken;
    if (!origin || !this.environment.corsOrigins.includes(origin) || !token || !expected ||
        !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      throw new ForbiddenException();
    }
    return true;
  }
}
