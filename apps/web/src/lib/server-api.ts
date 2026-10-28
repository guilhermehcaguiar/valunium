import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseHttpOrigin } from '@valunium/shared';
import type { UserProfile } from '@valunium/shared';

export function internalApiOrigin(): string {
  return parseHttpOrigin(process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001');
}
export const currentUser = cache(async (): Promise<UserProfile | null> => {
  const cookie = (await cookies()).get('valunium.sid');
  if (!cookie) return null;
  const response = await fetch(`${internalApiOrigin()}/api/v1/auth/me`, {
    headers: { cookie: `valunium.sid=${cookie.value}` }, cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Não foi possível consultar sua sessão.');
  const body = await response.json() as { data: UserProfile };
  return body.data;
});
export async function requireUser(): Promise<UserProfile> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}
