import { notFound } from 'next/navigation';
import { PortfolioForm } from '../../../../components/portfolios';
import { requireUser } from '../../../../lib/server-api';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(); const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return <PortfolioForm id={id} />;
}
