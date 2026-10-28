import type { IdentityRequest } from './types';
import { Body, Controller, Get, Post, Req, Res, UseGuards, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard, SessionAuthGuard } from './guards';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto';

const generic = { data: { message: 'Se os dados corresponderem a uma conta elegível, a solicitação será processada.' } };
@Controller({ path: 'auth', version: '1' })
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('csrf') @Throttle({ default: { limit: 120, ttl: 60_000 } })
  csrf(@Req() request: Request) {
    if (!request.session) throw new ServiceUnavailableException();
    request.session.csrfToken ??= randomBytes(32).toString('hex');
    return { data: { csrfToken: request.session.csrfToken } };
  }
  @Post('register') @HttpCode(202)
  async register(@Body() input: RegisterDto) { await this.auth.register(input); return generic; }
  @Post('login') @HttpCode(200) @UseGuards(LocalAuthGuard)
  async login(@Body() _input: LoginDto, @Req() request: IdentityRequest) {
    const user = request.user!;
    await new Promise<void>((resolve, reject) => request.session.regenerate(error => error ? reject(error) : resolve()));
    request.session.userId = user.id;
    request.session.authVersion = user.authVersion;
    request.session.csrfToken = randomBytes(32).toString('hex');
    await new Promise<void>((resolve, reject) => request.session.save(error => error ? reject(error) : resolve()));
    return { data: this.auth.profile(user) };
  }
  @Get('me') @Throttle({ default: { limit: 120, ttl: 60_000 } }) @UseGuards(SessionAuthGuard)
  me(@Req() request: IdentityRequest) { return { data: this.auth.profile(request.user!) }; }
  @Post('logout') @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await new Promise<void>((resolve, reject) => request.session.destroy(error => error ? reject(error) : resolve()));
    response.clearCookie('valunium.sid', { path: '/', httpOnly: true, sameSite: 'lax' });
    return { data: { message: 'Sessão encerrada.' } };
  }
  @Post('change-password') @HttpCode(200) @UseGuards(SessionAuthGuard)
  async change(@Body() input: ChangePasswordDto, @Req() request: IdentityRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.changePassword(request.user!.id, request.user!.authVersion, input.currentPassword, input.password);
    await new Promise<void>((resolve, reject) => request.session.destroy(error => error ? reject(error) : resolve()));
    response.clearCookie('valunium.sid', { path: '/', httpOnly: true, sameSite: 'lax' });
    return { data: { message: 'Senha alterada. Entre novamente.' } };
  }
  @Post('forgot-password') @HttpCode(202)
  async forgot(@Body() input: ForgotPasswordDto) { await this.auth.forgot(input.email); return generic; }
  @Post('reset-password') @HttpCode(200)
  async reset(@Body() input: ResetPasswordDto) { await this.auth.reset(input.token, input.password); return { data: { message: 'Senha redefinida. Entre novamente.' } }; }
}
