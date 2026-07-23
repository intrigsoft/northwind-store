import { money } from '@/lib/format';
import type { AppliedPromo, CartTotals } from '@/lib/types';

/** Subtotal / discount / shipping / tax / total rows, shared by cart + checkout. */
export function SummaryRows({ totals, promo }: { totals: CartTotals; promo: AppliedPromo | null }) {
  const showDiscount = !!promo?.eligible && totals.discount > 0;
  return (
    <>
      <div className="sum-row"><span>Subtotal</span><span className="price">{money(totals.subtotal)}</span></div>
      {showDiscount && (
        <div className="sum-row" style={{ color: 'var(--accent)' }}><span>Discount ({promo!.code})</span><span className="price">-{money(totals.discount)}</span></div>
      )}
      <div className="sum-row"><span>Shipping</span><span className="price">{totals.shipping === 0 ? 'Free' : money(totals.shipping)}</span></div>
      <div className="sum-row"><span>Estimated tax</span><span className="price">{money(totals.tax)}</span></div>
      <div className="sum-row total"><span>Total</span><span className="price">{money(totals.total)}</span></div>
    </>
  );
}
