import type { NextRequest } from 'next/server';
import { internalApiOrigin } from '../../../lib/server-api';
import { parseHttpOrigin } from '@valunium/shared';

export const dynamic = 'force-dynamic';
const allowed = /^(market\/(valuation|refresh|manual(?:\/[0-9a-f-]{36}(?:\/invalidate)?)?)|dashboard|auth\/(csrf|register|login|logout|me|change-password|forgot-password|reset-password)|assets(?:\/[0-9a-f-]{36})?|users\/me|portfolios(?:\/[0-9a-f-]{36}(?:\/(archive|restore|primary|positions(?:\/limitation)?|transactions(?:\/[0-9a-f-]{36}(?:\/(cancel|revisions))?)?|income(?:\/[0-9a-f-]{36}(?:\/(cancel|revisions))?)?))?)?)$/;
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  const endpoint = path.join('/');
  if (!allowed.test(endpoint) ) return new Response(null, { status: 404 });
  const webOrigin = parseHttpOrigin(process.env.WEB_ORIGIN ?? 'http://localhost:3000');
  const origin = request.headers.get('origin');
  if (!['GET', 'HEAD'].includes(request.method) && origin !== webOrigin) return new Response(null, { status: 403 });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const cookie = request.cookies.get('valunium.sid');
  if (cookie) headers.set('Cookie', `valunium.sid=${cookie.value}`);
  if (origin) headers.set('Origin', origin);
  const csrf = request.headers.get('x-csrf-token');
  if (csrf) headers.set('X-CSRF-Token', csrf);
  // Accepted only from a loopback proxy by the production API; not derived from client headers.
  headers.set('X-Forwarded-Proto', request.nextUrl.protocol.replace(':', ''));
  let body: string | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (Number(request.headers.get('content-length') ?? 0) > 16384) return new Response(null, { status: 413 });
    body = await request.text();
    if (Buffer.byteLength(body) > 16384) return new Response(null, { status: 413 });
  }
  try {
    const response = await fetch(`${internalApiOrigin()}/api/v1/${endpoint}${request.nextUrl.search}`, {
      method: request.method, headers, ...(body === undefined ? {} : { body }),
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    const outgoing = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    for (const value of response.headers.getSetCookie()) {
      if (value.startsWith('valunium.sid=')) outgoing.append('Set-Cookie', value);
    }
    return new Response(await response.text(), { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ error: { message: 'Serviço indisponível. Tente novamente.' } }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
