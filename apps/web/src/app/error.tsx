 'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section role="alert"><h1 className="text-3xl">Não foi possível carregar a página</h1><p className="my-5 text-secondary">Tente novamente em alguns instantes.</p><button onClick={reset} className="rounded-xl bg-gold px-6 py-3 font-semibold text-background">Tentar novamente</button></section>;
}
