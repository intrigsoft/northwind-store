import { getSession } from '@/server/session';
import { placeOrder, orderView } from '@/server/store';
import { json, fail } from '@/server/http';
import type { ShippingMethod } from '@/server/types';

export const dynamic = 'force-dynamic';

const METHODS: ShippingMethod[] = ['standard', 'express', 'nextday'];

/**
 * POST /api/checkout  { email, shippingMethod, address?, payment? }
 * Creates an order from the cart (guest checkout allowed), clears the cart,
 * and returns the created order. The total is computed server-side.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    shippingMethod?: ShippingMethod;
  };
  const session = await getSession();
  if (session.cart.length === 0) return fail('Cart is empty', 422);

  const method =
    body.shippingMethod && METHODS.includes(body.shippingMethod)
      ? body.shippingMethod
      : 'standard';

  const order = placeOrder(session, { email: body.email ?? '', shippingMethod: method });
  return json({ order: orderView(order) });
}
