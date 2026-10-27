import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'infra/prisma/schema.prisma',
  migrations: { path: 'infra/prisma/migrations' },
  // Allows validate/generate without a database. Commands that connect require DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
