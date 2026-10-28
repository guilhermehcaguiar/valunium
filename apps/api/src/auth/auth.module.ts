import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy, LocalAuthGuard, SessionAuthGuard } from './guards';
@Module({ imports: [PassportModule.register({ session: false })], controllers: [AuthController],
  providers: [AuthService, LocalStrategy, LocalAuthGuard, SessionAuthGuard], exports: [SessionAuthGuard] })
export class AuthModule {}
