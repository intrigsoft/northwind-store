/**
 * Domain types for the Northwind storefront backend.
 *
 * These shapes are the contract between the Next.js route handlers (the
 * "backend") and the client. The client imports the same types from
 * `@/lib/types`, which re-exports this file, so the wire format is checked on
 * both ends. The frontend never hardcodes catalog data — it only ever holds
 * these typed responses fetched from the API.
 */

export type CategorySlug = 'electronics' | 'home' | 'fashion' | 'beauty' | 'sports';

export interface Category {
  slug: string;
  name: string;
  hue: number;
  icon: string;
  sub: string[];
  /** Number of products in this category (filled in by the API). */
  count?: number;
}

/** A named colour/variant option: [label, hex]. */
export type ColorOption = [string, string];

/** A spec key/value pair: [key, value]. */
export type SpecPair = [string, string];

export interface Product {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  compareAt: number | null;
  rating: number;
  reviews: number;
  badges: string[];
  description: string;
  specs: SpecPair[];
  colors: ColorOption[] | null;
  sizes: string[] | null;
  /**
   * Image URLs, served by THIS backend (e.g. `/api/images/headphones?w=800`).
   * The client renders these directly and never knows the upstream source.
   */
  images: string[];
  sold: number;
  mall: boolean;
  freeShip: boolean;
  stock: number;
  /** Tinted placeholder colour used while/if the image fails to load. */
  tint: string;
  sku: string;
}

export interface Review {
  name: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  date: string;
}

export interface ReviewSummary {
  rating: number;
  total: number;
  /** Star distribution [5★, 4★, 3★, 2★, 1★] as percentages. */
  distribution: [number, number, number, number, number];
  reviews: Review[];
}

export interface CartLine {
  lineId: string;
  productId: string;
  qty: number;
  opt: string;
}

/** A cart line enriched with its product + computed line total, for display. */
export interface CartLineView extends CartLine {
  product: Product;
  lineTotal: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  /** Free-shipping threshold for standard shipping (e.g. 50). */
  freeShippingThreshold: number;
  /** How much more (post-discount) to spend for free standard shipping; 0 when already free. */
  amountToFreeShipping: number;
}

/** The promo applied to a cart, enriched with its evaluation against that cart. */
export interface AppliedPromo {
  code: string;
  /** Short scope label, e.g. "Electronics", "First order". */
  title: string;
  /** One-line human description of the deal. */
  description: string;
  /** True when the current cart qualifies (meets the minimum spend / scope). */
  eligible: boolean;
  /** Dollar discount this promo currently yields (0 when not yet eligible). */
  discount: number;
  /** Whether the promo grants free shipping. */
  freeShip: boolean;
  /** Why the cart doesn't qualify yet — present only when `eligible` is false. */
  reason?: string;
}

export interface Cart {
  lines: CartLineView[];
  count: number;
  promoCode: string | null;
  /** Detail of the applied promo (null when none is applied). */
  promo: AppliedPromo | null;
  totals: CartTotals;
}

/** A voucher as shown on the storefront (front-page cards + the assistant). */
export interface Voucher {
  code: string;
  /** Headline amount, e.g. "10", "$15", "FREE". */
  amount: string;
  /** Headline unit, e.g. "% OFF", "OFF", "SHIP". */
  unit: string;
  /** Scope label, e.g. "Electronics", "All orders". */
  title: string;
  /** Eligibility line, e.g. "Min. spend $30", "No minimum". */
  condition: string;
  /** One-line human description of the deal. */
  description: string;
}

/** One product in the live flash sale, enriched for display. */
export interface FlashItemView {
  product: Product;
  /** Flash price (the product's current sale price). */
  price: number;
  /** The pre-sale "was" price, if any. */
  compareAt: number | null;
  /** Units released for this flash sale. */
  stock: number;
  /** Units already claimed (depletes as visitors buy). */
  claimed: number;
  /** Claimed share, 0–100, for the progress bar. */
  pctClaimed: number;
  /** Units still available. */
  remaining: number;
  soldOut: boolean;
}

/** The live flash sale: a curated, time-boxed set the storefront + assistant share. */
export interface FlashSaleView {
  /** Epoch ms when the current flash window ends (drives the countdown). */
  endsAt: number;
  /** Whole seconds remaining in the window. */
  secondsLeft: number;
  items: FlashItemView[];
}

export type ShippingMethod = 'standard' | 'express' | 'nextday';

export type ReturnStatus = 'requested' | 'approved' | 'received' | 'refunded';

/** A return/refund request raised against a delivered order. */
export interface ReturnRequest {
  /** RMA id, e.g. "RMA-8001". */
  id: string;
  orderId: string;
  date: string;
  reason: string;
  status: ReturnStatus;
  statusLabel: string;
  /** Amount to be refunded once the return completes. */
  refund: number;
}

export type OrderStatus = 'processing' | 'transit' | 'delivered' | 'cancelled';
export type TrackState = 'done' | 'current' | 'pending';

export interface TrackStep {
  t: string;
  d: string;
  state: TrackState;
}

export interface OrderItem {
  productId: string;
  qty: number;
  opt: string;
}

export interface Order {
  id: string;
  email: string;
  date: string;
  status: OrderStatus;
  statusLabel: string;
  total: number;
  items: OrderItem[];
  eta: string;
  track: TrackStep[];
}

/** An order item enriched with its product, for display. */
export interface OrderItemView extends OrderItem {
  product: Product;
  lineTotal: number;
}

export interface OrderView extends Omit<Order, 'items'> {
  items: OrderItemView[];
}

export interface Address {
  id: string;
  label: string;
  name: string;
  line: string;
  city: string;
  country: string;
  phone: string;
  default: boolean;
}

export interface Card {
  id: string;
  brand: string;
  last4: string;
  exp: string;
  name: string;
  default: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  since: string;
  orders: number;
  addresses: Address[];
  cards: Card[];
  /** True for freshly-signed-up accounts (no history, empty address book). */
  isNew: boolean;
}

/** The public view of the signed-in user (or null for a guest). */
export type Me = User | null;

/** One shipping option, as advertised in the store policies. */
export interface ShippingOption {
  method: ShippingMethod;
  label: string;
  price: number;
  /** Order value above which this method is free, or null if never free. */
  freeOver: number | null;
  eta: string;
}

/** Store policies the assistant can quote truthfully (shipping, returns, etc.). */
export interface StorePolicies {
  store: string;
  freeShippingThreshold: number;
  shipping: ShippingOption[];
  returns: { windowDays: number; eligible: string; refund: string };
  payment: string[];
  support: string;
  /** Sales-tax rate applied to the post-discount subtotal. */
  taxRate: number;
}
