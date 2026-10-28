import { Profile } from '../../../../components/profile';
import { requireUser } from '../../../../lib/server-api';
export default async function Page() { return <Profile user={await requireUser()} />; }
