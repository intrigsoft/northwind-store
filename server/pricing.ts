/**
 * Pricing rules — the server is the source of truth.
 *
 * The frontend mirrors these for display, but every total returned to the
 * client (cart, checkout) is computed here. Mirrors the rules in BACKEND.md §3:
 *   - Shipping: free ≥ $50 (standard), else $5.99. Express $9.99, Next-day $16.99.
 *   - Tax: 8% of the post-discount subtotal.
 *
 * Promos (vouchers) are modelled richly so the four front-page vouchers all
 * behave for real — percentage off, a fixed amount off a category, and free
 * shipping — each gated by a minimum spend. Eligibility is evaluated against
 * the actual cart lines, so a category-scoped code only discounts (and only
 * counts the minimum against) items in that category.
 */
import type { CartTotals, CategorySlug, ShippingMethod } from './types';

export const FREE_SHIPPING_THRESHOLD = 50;
export const STANDARD_SHIPPING = 5.99;
export const EXPRESS_SHIPPING = 9.99;
export const NEXTDAY_SHIPPING = 16.99;
export const TAX_RATE = 0.08;

export type PromoKind = 'percent' | 'fixed' | 'freeship';

export interface Promo {
  code: string;
  kind: PromoKind;
  /** percent → fraction off (0.1 = 10%); fixed → dollars off; freeship → unused. */
  value: number;
  /**
   * When set, the discount applies only to items in this category and the
   * minimum spend is measured against that category's subtotal (not the whole
   * cart). Unset = applies to the whole cart.
   */
  category?: CategorySlug;
  /** Minimum eligible spend (whole-cart, or the category subtotal when scoped). */
  minSpend: number;
  /** Short marketing title shown on the voucher card (its "scope"). */
  title: string;
  /** One-line human description — used in toasts, summaries and by the assistant. */
  description: string;
}

/** The vouchers the store honours. Keyed by upper-case code. */
export const PROMOS: Record<string, Promo> = {
  NORTH10: {
    code: 'NORTH10', kind: 'percent', value: 0.1, minSpend: 30,
    title: 'First order', description: '10% off your order over $30',
  },
  TECH15: {
    code: 'TECH15', kind: 'fixed', value: 15, category: 'electronics', minSpend: 150,
    title: 'Electronics', description: '$15 off Electronics orders over $150',
  },
  FREESHIP: {
    code: 'FREESHIP', kind: 'freeship', value: 0, minSpend: 0,
    title: 'All orders', description: 'Free shipping on any order',
  },
  GLOW20: {
    code: 'GLOW20', kind: 'percent', value: 0.2, category: 'beauty', minSpend: 40,
    title: 'Beauty & Health', description: '20% off Beauty & Health over $40',
  },
};

export function getPromo(code: string | null | undefined): Promo | undefined {
  return code ? PROMOS[code.toUpperCase()] : undefined;
}

export function listPromos(): Promo[] {
  return Object.values(PROMOS);
}

export function isValidPromo(code: string): boolean {
  return !!getPromo(code);
}

/** The slice of a cart line pricing needs: unit price, quantity, category. */
export interface PricingLine {
  price: number;
  qty: number;
  category: string;
}

export interface PromoEval {
  eligible: boolean;
  /** Discount amount in dollars (0 when not eligible). */
  discount: number;
  /** Whether this promo zeroes the shipping cost. */
  freeShip: boolean;
  /** Why the cart doesn't qualify yet — present only when `eligible` is false. */
  reason?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Subtotal of the lines in `category` (or the whole cart when no category). */
function scopedSubtotal(lines: PricingLine[], category?: string): number {
  return round2(
    lines
      .filter((l) => !category || l.category === category)
      .reduce((n, l) => n + l.price * l.qty, 0),
  );
}

/**
 * Evaluate a promo against the cart: is it eligible, how much does it discount,
 * does it grant free shipping, and — when it doesn't qualify yet — why not.
 */
export function evaluatePromo(promo: Promo, lines: PricingLine[]): PromoEval {
  const scope = scopedSubtotal(lines, promo.category);
  if (scope < promo.minSpend) {
    const gap = round2(promo.minSpend - scope);
    const where = promo.category ? ` on ${promo.title}` : '';
    return {
      eligible: false,
      discount: 0,
      freeShip: false,
      reason: `Spend $${gap.toFixed(2)} more${where} to use ${promo.code}.`,
    };
  }
  switch (promo.kind) {
    case 'percent':
      return { eligible: true, discount: round2(scope * promo.value), freeShip: false };
    case 'fixed':
      // Never discount more than the eligible items are worth.
      return { eligible: true, discount: round2(Math.min(promo.value, scope)), freeShip: false };
    case 'freeship':
      return { eligible: true, discount: 0, freeShip: true };
  }
}

export function shippingFor(method: ShippingMethod, afterDiscount: number): number {
  if (afterDiscount === 0) return 0;
  switch (method) {
    case 'express':
      return EXPRESS_SHIPPING;
    case 'nextday':
      return NEXTDAY_SHIPPING;
    case 'standard':
    default:
      return afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  }
}

/**
 * Compute order totals authoritatively from the cart lines.
 *
 * Takes the lines (not just a subtotal) so category-scoped and free-shipping
 * promos can be evaluated. A stored promo that no longer qualifies (e.g. the
 * cart dropped below its minimum) simply contributes no discount — never throws.
 *
 * @param lines      cart lines (price × qty, with category)
 * @param promoCode  applied promo code, or null
 * @param method     shipping method (defaults to standard for the cart view)
 */
export function computeTotals(
  lines: PricingLine[],
  promoCode: string | null,
  method: ShippingMethod = 'standard',
): CartTotals {
  const sub = scopedSubtotal(lines);
  const promo = getPromo(promoCode);
  const evalR = promo ? evaluatePromo(promo, lines) : null;

  const discount = evalR?.eligible ? evalR.discount : 0;
  const afterDisc = round2(sub - discount);
  const shipping = evalR?.eligible && evalR.freeShip ? 0 : round2(shippingFor(method, afterDisc));
  const tax = round2(afterDisc * TAX_RATE);
  const total = round2(afterDisc + shipping + tax);

  // How much more to spend for free *standard* shipping (0 when already free,
  // or when an express/next-day method is chosen — those are never free).
  const amountToFreeShipping =
    method === 'standard' && shipping > 0
      ? round2(Math.max(0, FREE_SHIPPING_THRESHOLD - afterDisc))
      : 0;

  return {
    subtotal: sub,
    discount,
    shipping,
    tax,
    total,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    amountToFreeShipping,
  };
}
