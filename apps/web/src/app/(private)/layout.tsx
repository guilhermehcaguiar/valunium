import type { ReactNode } from 'react';
import { requireUser } from '../../lib/server-api';
import { PrivateShell } from '../../components/private-shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <PrivateShell name={user.name}>{children}</PrivateShell>;
}
