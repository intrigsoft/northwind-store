import { getSession } from '@/server/session';
import { reorder, cartView } from '@/server/store';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** POST /api/orders/:id/reorder — "Buy again": re-add the order's items to cart. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const order = reorder(session, id);
  if (!order) return fail('Order not found', 404);
  return json({ cart: cartView(session) });
}
