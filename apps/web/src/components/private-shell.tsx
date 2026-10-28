 'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/client-api';
import { Feedback } from './form-ui';
export function PrivateShell({ name, children }: { name: string; children: ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await api('auth/logout', 'POST'); router.replace('/login'); router.refresh(); }
    catch { setError('Não foi possível encerrar a sessão. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-8 md:grid-cols-[210px_minmax(0,1fr)]"><aside><nav aria-label="Navegação principal" className="flex flex-wrap gap-2 md:flex-col">{[['/dashboard', 'Visão geral'], ['/portfolios', 'Carteiras'], ['/assets', 'Ativos'], ['/settings/profile', 'Meu perfil']].map(([href, label]) => <Link key={href} href={href!} aria-current={path === href ? 'page' : undefined} className={`rounded-xl px-4 py-3 ${path === href ? 'bg-card text-gold' : 'text-secondary hover:bg-surface'}`}>{label}</Link>)}</nav></aside><div className="min-w-0"><header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5"><p className="text-secondary">Olá, <span className="text-foreground">{name}</span></p><button disabled={busy} onClick={logout} className="rounded-lg border border-line px-4 py-2 text-sm text-champagne">{busy ? 'Saindo…' : 'Encerrar sessão'}</button></header><Feedback message={error} error />{children}</div></div>;
}
