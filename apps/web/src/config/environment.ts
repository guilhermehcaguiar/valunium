import { parseHttpOrigin } from '@valunium/shared';
/** Public values only. Never import DATABASE_URL or server secrets into the web. */
export function publicApiOrigin(): string {
  return parseHttpOrigin(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');
}
