import { PortfolioForm } from '../../../../components/portfolios';
import { requireUser } from '../../../../lib/server-api';
export default async function Page() { await requireUser(); return <PortfolioForm />; }
