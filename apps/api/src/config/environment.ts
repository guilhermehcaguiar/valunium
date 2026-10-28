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
  brapiToken: string | undefined;
  brapiAuthorized: boolean;
  brapiTermsReference: string | undefined;
  quoteTtlMinutes: number;
  brapiBudget: number;
  brapiEnabled:boolean;
  brapiMode:'disabled'|'personal-memory'|'shared-postgres';
  brapiPersonalUserId:string|undefined;
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
  const integer = (key: string, fallback: string, min: number, max: number) => {
    const raw = env[key] ?? fallback;
    const n = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(n) || n < min || n > max) throw new Error('Invalid market data configuration');
    return n;
  };
  if (env.BRAPI_DATA_USE_AUTHORIZED && !['true','false'].includes(env.BRAPI_DATA_USE_AUTHORIZED)) throw new Error('Invalid market authorization');
  const brapiTermsReference = env.BRAPI_TERMS_REFERENCE?.trim() || undefined;
  const brapiAuthorized = env.BRAPI_DATA_USE_AUTHORIZED === 'true';
  if (brapiTermsReference && brapiTermsReference.length > 300) throw new Error('Invalid market policy reference');
  if(env.BRAPI_PROVIDER_ENABLED&&!['true','false'].includes(env.BRAPI_PROVIDER_ENABLED))throw new Error('Invalid provider enabled setting');
  const brapiMode=env.BRAPI_MODE??'disabled';
  if(!['disabled','personal-memory','shared-postgres'].includes(brapiMode))throw new Error('Invalid provider mode');
  const brapiPersonalUserId=env.BRAPI_PERSONAL_USER_ID?.trim()||undefined;
  if(brapiPersonalUserId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brapiPersonalUserId))throw new Error('Invalid personal provider owner');
  const brapiToken = env.BRAPI_API_TOKEN?.trim() || undefined;
  if (brapiToken && (!/^[\x21-\x7e]+$/.test(brapiToken) || brapiToken.length > 1024)) throw new Error('Invalid provider credential');
  if (nodeEnv === 'production' && (!databaseUrl || !sessionSecret || !webOrigin.startsWith('https://') || !env.SMTP_URL || !env.SMTP_FROM)) {
    throw new Error('Production requires identity configuration, HTTPS origin and SMTP transport');
  }
  return { nodeEnv: nodeEnv as Environment['nodeEnv'], port, host, corsOrigins,
    databaseUrl, sessionSecret, webOrigin, mailOutbox: env.MAIL_OUTBOX_DIR || undefined,
    smtpUrl: env.SMTP_URL || undefined, smtpFrom: env.SMTP_FROM || undefined,
    brapiToken, brapiAuthorized, brapiTermsReference,
    brapiEnabled:env.BRAPI_PROVIDER_ENABLED==='true',brapiMode:brapiMode as Environment['brapiMode'],brapiPersonalUserId,
    quoteTtlMinutes: integer('QUOTE_TTL_MINUTES','60',30,1440), brapiBudget: integer('BRAPI_REQUEST_BUDGET','10000',1,14000) };

}
