import type { ReactNode } from 'react';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-line bg-card p-6 sm:p-8"><h2 className="mb-3 text-xl font-medium">{title}</h2><div className="text-secondary leading-relaxed">{children}</div></section>;
}

export function StatusMessage({ title, children, busy = false }: { title: string; children: ReactNode; busy?: boolean }) {
  return <section role="status" aria-busy={busy} className="rounded-2xl border border-line bg-surface p-8"><h1 className="mb-3 text-2xl">{title}</h1><p className="text-secondary">{children}</p></section>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return <><a href="#conteudo" className="skip-link">Ir para o conteúdo</a><header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-7"><a href="/" aria-label="Valunium — início" className="text-2xl font-semibold tracking-tight">Valunium<span className="text-gold">.</span></a><span className="rounded-full border border-line px-4 py-2 text-xs tracking-widest text-champagne uppercase">Open source · Em construção</span></header><main id="conteudo" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">{children}</main><footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 border-t border-line px-6 py-8 text-sm text-secondary"><span>Valunium · AGPL-3.0-only</span><span>Consulta e análise. Nenhuma execução financeira.</span></footer></>;
}
