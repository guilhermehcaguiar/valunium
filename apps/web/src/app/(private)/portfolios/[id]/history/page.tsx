import { requireUser } from '../../../../../lib/server-api';
import { FinancialWorkspace } from '../../../../../components/financial-workspace';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireUser();const {id}=await params;return <FinancialWorkspace portfolioId={id}/>;}
