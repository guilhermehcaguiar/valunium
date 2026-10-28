import type { IdentityRequest } from '../auth/types';
import { Body, Controller, Get, Post, Patch, Param, ParseUUIDPipe, Req, UseGuards, HttpCode } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto';

@Controller({ path: 'portfolios', version: '1' })
@UseGuards(SessionAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfolios: PortfoliosService) {}
  @Get() async list(@Req() req: IdentityRequest) { return { data: await this.portfolios.list(req.user!.id) }; }
  @Post() async create(@Req() req: IdentityRequest, @Body() input: CreatePortfolioDto) { return { data: await this.portfolios.create(req.user!.id, input) }; }
  @Get(':id') async get(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) { return { data: await this.portfolios.get(req.user!.id, id) }; }
  @Patch(':id') async update(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string, @Body() input: UpdatePortfolioDto) { return { data: await this.portfolios.update(req.user!.id, id, input) }; }
  @Post(':id/archive') @HttpCode(200)
  async archive(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) { return { data: await this.portfolios.transition(req.user!.id, id, 'archive') }; }
  @Post(':id/restore') @HttpCode(200)
  async restore(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) { return { data: await this.portfolios.transition(req.user!.id, id, 'restore') }; }
  @Post(':id/primary') @HttpCode(200)
  async primary(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) { return { data: await this.portfolios.transition(req.user!.id, id, 'primary') }; }
}
