import { getSession } from '@/server/session';
import { getOrderView } from '@/server/store';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/orders/:id — a single order + tracking, scoped to the session. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const order = getOrderView(session, id);
  if (!order) return fail('Order not found', 404);
  return json({ order });
}
