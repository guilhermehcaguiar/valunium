import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../infra/prisma/generated/client/client';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.foundationMetadata.count();
    console.log('PASS: PostgreSQL connection and foundation migration');
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch(() => {
  console.error('FAIL: verify DATABASE_URL, PostgreSQL availability and migrations');
  process.exitCode = 1;
});
