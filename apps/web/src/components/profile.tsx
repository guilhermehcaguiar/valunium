 'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@valunium/shared';
import { api } from '../lib/client-api';
import { Field, Feedback, buttonClass, inputClass } from './form-ui';
export function Profile({ user }: { user: UserProfile }) {
  const router = useRouter(); const [message, setMessage] = useState(''); const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>, changePassword: boolean) {
    event.preventDefault(); setBusy(true); setMessage(''); setError(false);
    const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    try {
      await api(changePassword ? 'auth/change-password' : 'users/me', changePassword ? 'POST' : 'PATCH', data);
      if (changePassword) { form.reset(); router.replace('/login'); router.refresh(); }
      else { setMessage('Perfil atualizado.'); router.refresh(); }
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : 'Falha ao atualizar.'); }
    finally { setBusy(false); }
  }
  return <section className="max-w-2xl"><h1 className="mb-8 text-3xl font-medium">Meu perfil</h1><Feedback message={message} error={error} /><form onSubmit={event => submit(event, false)} className="mt-5 space-y-5 rounded-2xl border border-line bg-card p-6" aria-busy={busy}>
    <p className="break-all text-sm text-secondary">E-mail: {user.email}</p><Field label="Nome" id="profile-name" name="name" autoComplete="name" required minLength={1} maxLength={100} defaultValue={user.name} />
    <div><label htmlFor="locale">Idioma preferido</label><select id="locale" name="locale" defaultValue={user.locale} className={inputClass}><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option></select><p className="mt-2 text-xs text-secondary">Preferência armazenada. A interface desta etapa está em português.</p></div>
    <div><label htmlFor="timeZone">Fuso horário</label><select id="timeZone" name="timeZone" defaultValue={user.timeZone} className={inputClass}><option value="America/Sao_Paulo">Brasília — São Paulo</option><option value="UTC">UTC</option></select></div>
    <button disabled={busy} className={buttonClass}>Salvar perfil</button></form>
    <form onSubmit={event => submit(event, true)} className="mt-8 space-y-5 rounded-2xl border border-line bg-card p-6" aria-busy={busy}><h2 className="text-xl">Alterar senha</h2><p className="text-sm text-secondary">A alteração encerra todas as suas sessões.</p><Field label="Senha atual" id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required minLength={12} maxLength={128} /><Field label="Nova senha (12 a 128 caracteres)" id="newPassword" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /><button disabled={busy} className={buttonClass}>Alterar senha</button></form></section>;
}
