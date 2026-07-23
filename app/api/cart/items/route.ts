import { getSession } from '@/server/session';
import { addToCart, cartView } from '@/server/store';
import { getProduct } from '@/server/catalog';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** POST /api/cart/items  { productId, qty?, opt? } — add/merge a line. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    productId?: string;
    qty?: number;
    opt?: string;
  };
  if (!body.productId || !getProduct(body.productId)) {
    return fail('Unknown or missing productId', 400);
  }
  const session = await getSession();
  const qty = Math.max(1, Math.floor(body.qty ?? 1));
  addToCart(session, body.productId, qty, body.opt ?? '');
  return json(cartView(session));
}
