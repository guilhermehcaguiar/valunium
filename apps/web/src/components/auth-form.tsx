 'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/client-api';
import { Field, Feedback, FormPanel, buttonClass } from './form-ui';

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';
const titles = { login: 'Bem-vindo de volta', register: 'Crie sua conta', 'forgot-password': 'Recupere seu acesso', 'reset-password': 'Defina uma nova senha' };
export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [token, setToken] = useState('');
  useEffect(() => {
    if (mode === 'reset-password') {
      setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(false); setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);
    try {
      if (mode === 'reset-password' && !/^[a-f0-9]{64}$/.test(token)) throw new Error('Abra um link de recuperação válido recebido por e-mail.');
      await api(`auth/${mode}`, 'POST', mode === 'reset-password' ? { token, password: payload.password } : payload);
      if (mode === 'login') { router.replace('/dashboard'); router.refresh(); }
      else setMessage(mode === 'register' ? 'Se o cadastro pôde ser realizado, sua conta está pronta. Entre com seus dados.' :
        mode === 'forgot-password' ? 'Se o e-mail estiver cadastrado, enviaremos instruções de recuperação.' : 'Senha redefinida. Entre com sua nova senha.');
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); }
  }
  return <FormPanel title={titles[mode]}><form onSubmit={submit} className="space-y-5" aria-busy={busy}>
    {mode === 'register' && <Field label="Nome" id="name" name="name" autoComplete="name" required maxLength={100} />}
    {mode !== 'reset-password' && <Field label="E-mail" id="email" name="email" type="email" autoComplete="email" required maxLength={254} />}
    {mode !== 'forgot-password' && <Field label={mode === 'reset-password' ? 'Nova senha (12 a 128 caracteres)' : 'Senha (12 a 128 caracteres)'} id="password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={12} maxLength={128} />}
    <Feedback message={message} error={error} /><button disabled={busy} className={`${buttonClass} w-full`}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : mode === 'forgot-password' ? 'Enviar instruções' : 'Redefinir senha'}</button>
  </form><nav aria-label="Acesso à conta" className="mt-7 flex flex-wrap gap-4 text-sm text-gold"><Link href="/login">Entrar</Link><Link href="/register">Criar conta</Link><Link href="/forgot-password">Esqueci minha senha</Link></nav></FormPanel>;
}
