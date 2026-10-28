import type { InputHTMLAttributes, ReactNode } from 'react';
export const inputClass = 'mt-2 block w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground';
export const buttonClass = 'rounded-xl bg-gold px-5 py-3 font-semibold text-background hover:bg-soft-gold disabled:cursor-wait disabled:opacity-60';
export function Field({ label, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return <div><label htmlFor={id} className="text-sm text-secondary">{label}</label><input {...props} id={id} className={inputClass} /></div>;
}
export function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  return message ? <p role={error ? 'alert' : 'status'} className="rounded-xl border border-line bg-surface p-4 text-sm text-champagne">{message}</p> : null;
}
export function FormPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mx-auto max-w-md rounded-2xl border border-line bg-card p-6 sm:p-8"><h1 className="mb-7 text-3xl font-medium">{title}</h1>{children}</section>;
}
