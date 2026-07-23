import { getSession } from '@/server/session';
import { cancelOrder, orderView } from '@/server/store';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** POST /api/orders/:id/cancel — cancel an order that hasn't shipped yet. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const result = cancelOrder(session, id);
  if (!result.ok) return fail(result.reason, result.status);
  return json({ order: orderView(result.order) });
}
