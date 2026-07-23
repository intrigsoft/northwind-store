import { listPromos, type Promo } from '@/server/pricing';
import { json } from '@/server/http';
import type { Voucher } from '@/server/types';

export const dynamic = 'force-dynamic';

/** Project a promo into the display shape the voucher cards + assistant use. */
function toVoucher(p: Promo): Voucher {
  const amount =
    p.kind === 'percent' ? String(Math.round(p.value * 100)) :
    p.kind === 'fixed' ? `$${p.value}` :
    'FREE';
  const unit = p.kind === 'percent' ? '% OFF' : p.kind === 'fixed' ? 'OFF' : 'SHIP';
  const condition = p.minSpend > 0 ? `Min. spend $${p.minSpend}` : 'No minimum';
  return { code: p.code, amount, unit, title: p.title, condition, description: p.description };
}

/**
 * GET /api/vouchers
 * The store's active vouchers — a single source of truth shared by the
 * front-page voucher cards and the assistant's `list_vouchers` tool. Derived
 * from the same promo model the pricing engine enforces, so what's advertised
 * is exactly what the cart will honour.
 */
export function GET() {
  return json({ vouchers: listPromos().map(toVoucher) });
}
