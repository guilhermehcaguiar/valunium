 'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PortfolioSummary } from '@valunium/shared';
import { api } from '../lib/client-api';
import { Field, Feedback, buttonClass, inputClass } from './form-ui';

export function PortfolioList() {
  const [items, setItems] = useState<PortfolioSummary[] | null>(null); const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let mounted = true; api<PortfolioSummary[]>('portfolios').then(data => { if (mounted) setItems(data); }).catch(() => { if (mounted) setError('Não foi possível carregar as carteiras.'); }); return () => { mounted = false; }; }, [attempt]);
  return <><header className="mb-8 flex flex-wrap items-center justify-between gap-5"><h1 className="text-3xl font-medium">Minhas carteiras</h1><Link href="/portfolios/new" className={buttonClass}>Nova carteira</Link></header><Feedback message={error} error />{error && <button className="my-4 text-gold underline" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Tentar novamente</button>}
  {!items && !error && <p role="status">Carregando carteiras…</p>}{items?.length === 0 && <section className="rounded-2xl border border-line bg-card p-8"><h2 className="text-xl">Sua organização começa aqui</h2><p className="mt-3 text-secondary">Você ainda não criou uma carteira. Escolha um nome para começar.</p></section>}
  <ul className="grid gap-4">{items?.map(item => <li key={item.id} className="rounded-2xl border border-line bg-card p-6"><div className="flex flex-wrap items-center justify-between gap-4"><Link href={`/portfolios/${item.id}`} className="text-xl text-champagne underline decoration-line underline-offset-4">{item.name}</Link><span className="text-sm text-secondary">{item.archivedAt ? 'Arquivada' : item.isPrimary ? 'Principal' : 'Ativa'} · {item.baseCurrency}</span></div><p className="mt-3 break-words text-secondary">{item.description || 'Sem descrição.'}</p></li>)}</ul></>;
}

export function PortfolioForm({ id }: { id?: string }) {
  const router = useRouter();
  const [item, setItem] = useState<PortfolioSummary | null>(null); const [loading, setLoading] = useState(Boolean(id));
  const [message, setMessage] = useState(''); const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!id) return; let mounted = true;
    api<PortfolioSummary>(`portfolios/${id}`).then(data => { if (mounted) setItem(data); }).catch(() => { if (mounted) { setError(true); setMessage('Carteira não encontrada ou indisponível.'); } }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; }; }, [id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setError(false);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<PortfolioSummary>(id ? `portfolios/${id}` : 'portfolios', id ? 'PATCH' : 'POST', {
        name: String(form.get('name')), description: String(form.get('description')), ...(id ? {} : { baseCurrency: 'BRL' }),
      });
      if (!id) router.replace(`/portfolios/${result.id}`);
      else { setItem(result); setMessage('Carteira atualizada.'); }
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  }
  async function transition(action: string) {
    setBusy(true); setMessage(''); setError(false);
    try { setItem(await api<PortfolioSummary>(`portfolios/${id}/${action}`, 'POST')); setMessage('Carteira atualizada.'); }
    catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : 'Falha ao atualizar.'); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Carregando carteira…</p>;
  return <section className="max-w-2xl"><Link href="/portfolios" className="text-sm text-gold underline">Voltar às carteiras</Link>{id && <Link href={`/portfolios/${id}/history`} className="ml-4 text-gold underline">Histórico e posições</Link>}<h1 className="my-6 text-3xl font-medium">{id ? 'Detalhes da carteira' : 'Nova carteira'}</h1><Feedback message={message} error={error} />{(!id || item) && <>
  <p className="my-4 text-sm text-secondary">Moeda-base: BRL{item ? ` · ${item.archivedAt ? 'Arquivada' : item.isPrimary ? 'Principal' : 'Ativa'}` : ''}</p>
  <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-card p-6" aria-busy={busy}>
    <Field label="Nome da carteira" id="portfolio-name" name="name" required minLength={1} maxLength={100} defaultValue={item?.name ?? ''} />
    <div><label htmlFor="description" className="text-sm text-secondary">Descrição (opcional)</label><textarea id="description" name="description" maxLength={1000} defaultValue={item?.description ?? ''} rows={4} className={inputClass} /></div>
    <button className={buttonClass} disabled={busy}>{busy ? 'Salvando…' : id ? 'Salvar alterações' : 'Criar carteira'}</button>
  </form>{item && <div className="mt-6 flex flex-wrap gap-4">{!item.archivedAt && !item.isPrimary && <button disabled={busy} onClick={() => transition('primary')} className="rounded-xl border border-line px-4 py-3 text-champagne">Definir como principal</button>}<button disabled={busy} onClick={() => transition(item.archivedAt ? 'restore' : 'archive')} className="rounded-xl border border-line px-4 py-3 text-champagne">{item.archivedAt ? 'Reativar carteira' : 'Arquivar carteira'}</button></div>}</>}</section>;
}
