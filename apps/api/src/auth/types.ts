import type { UserProfile } from '@valunium/shared';
import type { Request } from 'express';
export interface AuthIdentity extends UserProfile { authVersion: number }
export type IdentityRequest = Request & { user: AuthIdentity };
declare module 'express-session' {
  interface SessionData { userId?: string; authVersion?: number; csrfToken?: string }
}
