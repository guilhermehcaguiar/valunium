import { requireUser } from '../../../lib/server-api';
import { Dashboard } from '../../../components/dashboard';
export default async function Page(){await requireUser();return <Dashboard/>;}
