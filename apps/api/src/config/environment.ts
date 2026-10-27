import { parseHttpOrigin } from '@valunium/shared';

export interface Environment {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  host: string;
  corsOrigins: string[];
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
  return { nodeEnv: nodeEnv as Environment['nodeEnv'], port, host, corsOrigins };
}
