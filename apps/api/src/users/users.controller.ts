import type { IdentityRequest } from '../auth/types';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthGuard } from '../auth/guards';
import { Database } from '../core/database';
import { ProfileDto } from '../auth/dto';
import { publicUserSelect } from '../auth/auth.service';
import { Module } from '@nestjs/common';

@Controller({ path: 'users/me', version: '1' })
@UseGuards(SessionAuthGuard)
class UsersController {
  constructor(private readonly db: Database) {}
  @Get()
  me(@Req() request: IdentityRequest) {
    const user = request.user!;
    return { data: { id: user.id, email: user.email, name: user.name, locale: user.locale, timeZone: user.timeZone } };
  }
  @Patch()
  async update(@Body() input: ProfileDto, @Req() request: IdentityRequest) {
    return { data: await this.db.client.user.update({ where: { id: request.user!.id }, data: input, select: publicUserSelect }) };
  }
}
@Module({ imports: [AuthModule], controllers: [UsersController] })
export class UsersModule {}
