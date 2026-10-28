export interface HealthResponse {
  data: { status: 'ok'; service: 'valunium-api'; version: 'v1' };
}

export interface ApiErrorResponse {
  error: { code: string; message: string };
  requestId: string;
}

/** Accept only an HTTP(S) origin, without credentials, path, query or fragment. */
export function parseHttpOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.origin === 'null') {
    throw new Error('Invalid HTTP origin');
  }
  return url.origin;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  locale: string;
  timeZone: string;
}
export interface PortfolioSummary {
  id: string;
  name: string;
  description: string;
  baseCurrency: 'BRL';
  isPrimary: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
