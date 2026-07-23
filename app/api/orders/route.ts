import { getSession } from '@/server/session';
import { listOrderViews } from '@/server/store';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/orders — orders placed this session + the returning user's history. */
export async function GET() {
  const session = await getSession();
  return json({ orders: listOrderViews(session) });
}
