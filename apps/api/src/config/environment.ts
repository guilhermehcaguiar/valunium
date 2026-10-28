import { parseHttpOrigin } from '@valunium/shared';

export interface Environment {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  host: string;
  corsOrigins: string[];
  databaseUrl: string | undefined;
  sessionSecret: string | undefined;
  webOrigin: string;
  mailOutbox: string | undefined;
  smtpUrl: string | undefined;
  smtpFrom: string | undefined;
}

export function readEnvironment(env: NodeJS.ProcessEnv = process.env): Environment {
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('Invalid NODE_ENV');
  const portText = env.PORT ?? '3001';
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid PORT');
  }
  const host = env.HOST ?? '127.0.0.1';
  if (!host || /\s/.test(host)) throw new Error('Invalid HOST');
  const origins = env.CORS_ORIGINS ?? (nodeEnv === 'development' ? 'http://localhost:3000' : '');
  const corsOrigins = origins ? origins.split(',').map((origin) => parseHttpOrigin(origin.trim())) : [];
  const databaseUrl = env.DATABASE_URL || undefined;
  const sessionSecret = env.SESSION_SECRET || undefined;
  if (sessionSecret && (Buffer.byteLength(sessionSecret) < 32 || sessionSecret.includes('CHANGE_ME'))) {
    throw new Error('SESSION_SECRET must contain at least 32 random bytes');
  }
  if (Boolean(databaseUrl) !== Boolean(sessionSecret)) throw new Error('Configure DATABASE_URL and SESSION_SECRET together');
  const webOrigin = parseHttpOrigin(env.WEB_ORIGIN ?? 'http://localhost:3000');
  if (nodeEnv === 'production' && (!databaseUrl || !sessionSecret || !webOrigin.startsWith('https://') || !env.SMTP_URL || !env.SMTP_FROM)) {
    throw new Error('Production requires identity configuration, HTTPS origin and SMTP transport');
  }
  return { nodeEnv: nodeEnv as Environment['nodeEnv'], port, host, corsOrigins,
    databaseUrl, sessionSecret, webOrigin, mailOutbox: env.MAIL_OUTBOX_DIR || undefined,
    smtpUrl: env.SMTP_URL || undefined, smtpFrom: env.SMTP_FROM || undefined };

}
