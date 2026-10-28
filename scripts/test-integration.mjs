import { mkdtempSync, chmodSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Always creates its own cluster. Never reads a supplied DATABASE_URL or resets an existing DB.
const directory = mkdtempSync(join(tmpdir(), 'valunium-stage02-'));
chmodSync(directory, 0o700);
const data = join(directory, 'data');
const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
const pg = (name, args) => execFileSync(join(bin, name), args, { stdio: 'pipe' });
let started = false;
try {
  pg('initdb', ['-D', data, '--auth-local=trust', '--auth-host=reject', '--no-locale', '--encoding=UTF8']);
  pg('pg_ctl', ['-D', data, '-l', join(directory, 'postgres.log'), '-o', `-k ${directory} -p 55449 -c listen_addresses=''`, '-w', 'start']);
  started = true;
  pg('createdb', ['-h', directory, '-p', '55449', 'valunium_stage02_disposable']);
  const url = new URL('postgresql://localhost:55449/valunium_stage02_disposable');
  url.username = userInfo().username; url.searchParams.set('host', directory);
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(),
    SESSION_SECRET: randomBytes(48).toString('hex'), CORS_ORIGINS: 'http://localhost:3000', WEB_ORIGIN: 'http://localhost:3000',
    MAIL_OUTBOX_DIR: join(directory, 'mail'), INTEGRATION_DATABASE_URL: url.toString() };
  // Unrelated SMTP configuration from the invoking shell must never receive synthetic test mail.
  delete env.SMTP_URL; delete env.SMTP_FROM;
  // Tests never consume an operator's quote token or infer permission to redistribute real data.
  delete env.BRAPI_API_TOKEN; delete env.BRAPI_TERMS_REFERENCE; delete env.BRAPI_PERSONAL_USER_ID;
  env.BRAPI_PROVIDER_ENABLED='false'; env.BRAPI_MODE='disabled';
  env.BRAPI_DATA_USE_AUTHORIZED='false';
  const migration = spawnSync('pnpm', ['db:migrate'], { env, stdio: 'inherit' });
  if (migration.status !== 0) throw new Error('Disposable migration failed');
  const args = process.argv.includes('--browser') ? ['scripts/test-browser.mjs'] : ['--test', '--test-concurrency=1', 'apps/api/test/integration/identity.cjs', 'apps/api/test/integration/market.cjs'];
  const test = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (test.status !== 0) process.exitCode = 1;
} catch {
  console.error('FAIL: native PostgreSQL integration. Verify pg_config/initdb/pg_ctl and local socket permissions.');
  process.exitCode = 1;
} finally {
  if (started) pg('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  console.log('Disposable PostgreSQL stopped. Private artifacts remain in:', directory);
}
