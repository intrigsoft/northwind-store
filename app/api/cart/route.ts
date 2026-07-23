import type { NextRequest } from 'next/server';
import { getSession } from '@/server/session';
import { cartView } from '@/server/store';
import { json } from '@/server/http';
import type { ShippingMethod } from '@/server/types';

export const dynamic = 'force-dynamic';

const METHODS: ShippingMethod[] = ['standard', 'express', 'nextday'];

/** GET /api/cart?method= — current cart with authoritative totals. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const m = req.nextUrl.searchParams.get('method') as ShippingMethod | null;
  const method = m && METHODS.includes(m) ? m : 'standard';
  return json(cartView(session, method));
}
