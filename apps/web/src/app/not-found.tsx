import Link from 'next/link';
export default function NotFound() { return <section><h1 className="text-3xl">Página não encontrada</h1><p className="my-5 text-secondary">Este endereço não está disponível.</p><Link href="/" className="text-gold underline">Voltar ao início</Link></section>; }
