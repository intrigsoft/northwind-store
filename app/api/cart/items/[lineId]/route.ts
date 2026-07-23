import { getSession } from '@/server/session';
import { updateCartQty, removeCartLine, cartView } from '@/server/store';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** PATCH /api/cart/items/:lineId  { qty } — qty 0 removes the line. */
export async function PATCH(req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const body = (await req.json().catch(() => ({}))) as { qty?: number };
  const session = await getSession();
  updateCartQty(session, decodeURIComponent(lineId), Math.floor(body.qty ?? 0));
  return json(cartView(session));
}

/** DELETE /api/cart/items/:lineId — remove a line. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const session = await getSession();
  removeCartLine(session, decodeURIComponent(lineId));
  return json(cartView(session));
}
