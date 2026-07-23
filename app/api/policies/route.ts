import { storePolicies } from '@/server/policies';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/policies — shipping, returns, payment + free-shipping facts. */
export async function GET() {
  return json(storePolicies());
}
