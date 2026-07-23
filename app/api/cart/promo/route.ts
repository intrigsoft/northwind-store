import { getSession } from '@/server/session';
import { setPromo, applyPromo, cartView } from '@/server/store';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/promo  { code }
 * Applies a voucher to the cart. An empty/null code clears any applied promo.
 * A valid code whose conditions aren't met (minimum spend / category scope) is
 * rejected with a 422 and a message explaining what's needed.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: string | null };
  const session = await getSession();

  if (!body.code) {
    setPromo(session, null);
    return json(cartView(session));
  }

  const result = applyPromo(session, body.code);
  if (!result.ok) {
    return fail(result.reason, 422);
  }
  return json(cartView(session));
}
