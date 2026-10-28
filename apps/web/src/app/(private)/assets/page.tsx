import { requireUser } from '../../../lib/server-api';
import { FinancialWorkspace } from '../../../components/financial-workspace';
export default async function Page(){await requireUser();return <FinancialWorkspace/>;}
