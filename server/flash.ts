/**
 * Flash sale — a real, time-boxed sale the storefront and the assistant share.
 *
 * Unlike the cosmetic version this replaces, the flash sale is a genuine model:
 *   - a *curated* set of products (the deepest discounts), not "anything on sale";
 *   - a real end time, so the homepage countdown ticks toward an actual deadline;
 *   - per-item stock that *depletes* when visitors buy, so the "% claimed" bar and
 *     "sold out" state reflect reality rather than a formula.
 *
 * State lives on `globalThis` (like the store) so it survives dev HMR and is
 * shared across route handlers. When a window elapses the sale rolls forward to
 * the next one with a fresh allocation, so a demo never shows a dead sale.
 *
 * Pricing note: the flash price IS the product's current sale price (`price`,
 * marked down from `compareAt`). The flash sale curates + time-boxes + adds
 * scarcity; it does not introduce a separate price the cart would have to honour
 * — so the totals computed by `pricing.ts` stay the single source of truth.
 */
import { products, getProduct } from './catalog';
import type { FlashItemView, FlashSaleView } from './types';

/** How many products are in the flash sale. */
const FLASH_SIZE = 6;
/** Hour of day (local) the flash window ends. Matches the homepage countdown. */
const END_HOUR = 22;

interface FlashItemState {
  productId: string;
  stock: number;
  claimed: number;
}
interface FlashState {
  endsAt: number;
  items: FlashItemState[];
}

const g = globalThis as unknown as { __nwFlash?: FlashState };

/** The curated product ids: the deepest markdowns, highest discount first. */
function curate(): string[] {
  return products
    .filter((p) => p.compareAt)
    .map((p) => ({ id: p.id, off: (p.compareAt! - p.price) / p.compareAt! }))
    .sort((a, b) => b.off - a.off)
    .slice(0, FLASH_SIZE)
    .map((x) => x.id);
}

/** Seed each flash item with a deterministic stock + an already-claimed share. */
function seedItems(): FlashItemState[] {
  return curate().map((productId, i) => {
    const stock = 50 + ((i * 17) % 80); // 50–129 units
    const claimed = Math.round(stock * (0.35 + (i % 5) * 0.12)); // 35%–83% gone
    return { productId, stock, claimed: Math.min(claimed, stock) };
  });
}

/** Epoch ms of the next END_HOUR boundary at or after `now`. */
function nextEnd(now: number): number {
  const d = new Date(now);
  d.setHours(END_HOUR, 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Current flash state, rolling to a fresh window if the last one elapsed. */
function flashState(): FlashState {
  const now = Date.now();
  let st = g.__nwFlash;
  if (!st) {
    st = g.__nwFlash = { endsAt: nextEnd(now), items: seedItems() };
  } else if (now > st.endsAt) {
    st.endsAt = nextEnd(now);
    st.items = seedItems();
  }
  return st;
}

/** The flash sale as the storefront + assistant see it. */
export function flashSaleView(): FlashSaleView {
  const st = flashState();
  const now = Date.now();
  const items: FlashItemView[] = st.items
    .map((it): FlashItemView | null => {
      const product = getProduct(it.productId);
      if (!product) return null;
      const remaining = Math.max(0, it.stock - it.claimed);
      return {
        product,
        price: product.price,
        compareAt: product.compareAt,
        stock: it.stock,
        claimed: it.claimed,
        pctClaimed: Math.min(100, Math.round((it.claimed / it.stock) * 100)),
        remaining,
        soldOut: remaining === 0,
      };
    })
    .filter((x): x is FlashItemView => x !== null);

  return {
    endsAt: st.endsAt,
    secondsLeft: Math.max(0, Math.round((st.endsAt - now) / 1000)),
    items,
  };
}

/** Record a purchase against the flash sale, depleting the item's stock. */
export function recordFlashPurchase(productId: string, qty: number): void {
  const st = flashState();
  const it = st.items.find((x) => x.productId === productId);
  if (it) it.claimed = Math.min(it.stock, it.claimed + qty);
}
