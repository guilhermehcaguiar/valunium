import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Database } from '../core/database';
import type { Prisma } from '../generated/prisma/client';
import type { CreatePortfolioDto, UpdatePortfolioDto } from './dto';

export const portfolioSelect = { id: true, name: true, description: true, baseCurrency: true, isPrimary: true,
  archivedAt: true, createdAt: true, updatedAt: true } as const;
@Injectable()
export class PortfoliosService {
  constructor(private readonly db: Database) {}
  list(ownerId: string) {
    return this.db.client.portfolio.findMany({ where: { ownerId }, select: portfolioSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  }
  async get(ownerId: string, id: string) {
    const item = await this.db.client.portfolio.findFirst({ where: { ownerId, id }, select: portfolioSelect });
    if (!item) throw new NotFoundException();
    return item;
  }
  // Serializes owner-level primary/lifecycle changes across requests and API processes.
  private async lock(tx: Prisma.TransactionClient, ownerId: string) {
    await tx.user.update({ where: { id: ownerId }, data: { updatedAt: new Date() }, select: { id: true } });
  }
  create(ownerId: string, input: CreatePortfolioDto) {
    return this.db.client.$transaction(async tx => {
      await this.lock(tx, ownerId);
      const hasPrimary = await tx.portfolio.count({ where: { ownerId, isPrimary: true } });
      return tx.portfolio.create({ data: { ownerId, name: input.name, description: input.description ?? '', baseCurrency: input.baseCurrency ?? 'BRL', isPrimary: hasPrimary === 0 }, select: portfolioSelect });
    });
  }
  async update(ownerId: string, id: string, input: UpdatePortfolioDto) {
    const result = await this.db.client.portfolio.updateMany({ where: { ownerId, id }, data: input });
    if (!result.count) throw new NotFoundException();
    return this.get(ownerId, id);
  }
  transition(ownerId: string, id: string, action: 'archive' | 'restore' | 'primary') {
    return this.db.client.$transaction(async tx => {
      await this.lock(tx, ownerId);
      const item = await tx.portfolio.findFirst({ where: { id, ownerId } });
      if (!item) throw new NotFoundException();
      if (action === 'primary') {
        if (item.archivedAt) throw new BadRequestException();
        await tx.portfolio.updateMany({ where: { ownerId, isPrimary: true }, data: { isPrimary: false } });
        await tx.portfolio.update({ where: { id, ownerId }, data: { isPrimary: true } });
      } else if (action === 'archive') {
        await tx.portfolio.update({ where: { id, ownerId }, data: { archivedAt: item.archivedAt ?? new Date(), isPrimary: false } });
        if (item.isPrimary) {
          const next = await tx.portfolio.findFirst({ where: { ownerId, archivedAt: null, id: { not: id } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
          if (next) await tx.portfolio.update({ where: { id: next.id, ownerId }, data: { isPrimary: true } });
        }
      } else {
        const hasPrimary = await tx.portfolio.count({ where: { ownerId, isPrimary: true } });
        await tx.portfolio.update({ where: { id, ownerId }, data: { archivedAt: null, isPrimary: item.isPrimary || hasPrimary === 0 } });
      }
      return tx.portfolio.findFirstOrThrow({ where: { id, ownerId }, select: portfolioSelect });
    });
  }
}
