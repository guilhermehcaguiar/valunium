import type { AuthIdentity } from './types';
import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import argon2 from 'argon2';
import { Database } from '../core/database';
import { MailDelivery } from '../core/mail';
import { ENVIRONMENT } from '../core/environment.token';
import type { Environment } from '../config/environment';
import type { RegisterDto } from './dto';
import type { UserProfile } from '@valunium/shared';

const options = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const publicUserSelect = { id: true, name: true, email: true, locale: true, timeZone: true } as const;

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash(randomBytes(32).toString('hex'), options);
  constructor(private readonly db: Database, private readonly mail: MailDelivery,
    @Inject(ENVIRONMENT) private readonly environment: Environment) {}

  async register(input: RegisterDto): Promise<void> {
    const passwordHash = await argon2.hash(input.password, options);
    try { await this.db.client.user.create({ data: { name: input.name, email: input.email, passwordHash }, select: { id: true } }); }
    catch (error: unknown) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')) throw error;
    }
  }
  async validate(email: string, password: string): Promise<AuthIdentity> {
    const user = await this.db.client.user.findUnique({ where: { email } });
    const valid = await argon2.verify(user?.passwordHash ?? await this.dummyHash, password);
    if (!user || !valid) throw new UnauthorizedException();
    return { ...this.profile(user), authVersion: user.authVersion };
  }
  profile(user: UserProfile): UserProfile {
    return { id: user.id, email: user.email, name: user.name, locale: user.locale, timeZone: user.timeZone };
  }
  async changePassword(id: string, version: number, current: string, password: string): Promise<void> {
    const user = await this.db.client.user.findUnique({ where: { id } });
    if (!user || user.authVersion !== version || !await argon2.verify(user.passwordHash, current)) throw new UnauthorizedException();
    const passwordHash = await argon2.hash(password, options);
    await this.db.client.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({ where: { id, authVersion: version }, data: { passwordHash, authVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new UnauthorizedException();
      await tx.passwordReset.deleteMany({ where: { userId: id } });
    });
  }
  async forgot(email: string): Promise<void> {
    const started = Date.now();
    const token = randomBytes(32).toString('hex');
    const user = await this.db.client.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (user) {
      await this.db.client.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });
        await tx.passwordReset.deleteMany({ where: { userId: user.id } });
        await tx.passwordReset.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 15 * 60_000) } });
      });
      this.mail.enqueue({ to: user.email, resetUrl: `${this.environment.webOrigin}/reset-password#token=${token}` });
    }
    await delay(Math.max(0, 200 - (Date.now() - started)));
  }
  async reset(token: string, password: string): Promise<void> {
    const passwordHash = await argon2.hash(password, options);
    await this.db.client.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash: digest(token) } });
      if (!reset) throw new BadRequestException();
      // Lock the owner before consuming the token; concurrent reset/forgot/change serialize here.
      await tx.user.update({ where: { id: reset.userId }, data: { updatedAt: new Date() } });
      const consumed = await tx.passwordReset.deleteMany({ where: { id: reset.id, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new BadRequestException();
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, authVersion: { increment: 1 } } });
      await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
    });
  }
}
