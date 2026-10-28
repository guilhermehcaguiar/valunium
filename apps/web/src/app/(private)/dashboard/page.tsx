import Link from 'next/link';
import { requireUser } from '../../../lib/server-api';
import { Card } from '../../../components/ui';
export default async function Dashboard() {
  await requireUser();
  return <><p className="mb-3 text-sm text-gold">Seu espaço patrimonial</p><h1 className="mb-8 text-3xl font-medium">Visão geral</h1><Card title="Comece pelas suas carteiras"><p>Organize suas carteiras e mantenha seus dados de perfil atualizados. Registros históricos e análises serão construídos nas próximas etapas.</p><Link href="/portfolios" className="mt-6 inline-block text-gold underline">Ver minhas carteiras</Link></Card></>;
}
