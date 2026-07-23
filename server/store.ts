/**
 * In-memory store — the demo "database".
 *
 * State lives in a module-level singleton stashed on `globalThis` so it survives
 * dev HMR and is shared across all route handlers in the Node process. This is
 * intentionally not durable: restarting the server resets all carts/orders, which
 * is the right weight for a demo. Sessions are keyed by an opaque cookie id; a
 * session may be a guest (user === null) or authenticated.
 *
 * The anonymous → authenticated flow (BACKEND.md §4) falls out naturally: login
 * attaches a user to the SAME session, so the guest's cart and wishlist simply
 * carry over — no separate merge step needed.
 */
import { randomUUID } from 'node:crypto';
import {
  products,
  getProduct,
  demoUser,
  demoHistoryOrders,
} from './catalog';
import { computeTotals, evaluatePromo, getPromo, type PricingLine, type Promo } from './pricing';
import { recordFlashPurchase } from './flash';
import type {
  CartLine,
  Cart,
  CartLineView,
  AppliedPromo,
  Order,
  OrderView,
  ReturnRequest,
  ReturnStatus,
  ShippingMethod,
  User,
} from './types';

export interface Session {
  id: string;
  /** Authenticated user, or null for a guest. */
  user: User | null;
  cart: CartLine[];
  wishlist: string[];
  promoCode: string | null;
  /** Orders placed in this session (guest or authenticated). */
  orders: Order[];
  /** Return/refund requests raised in this session. */
  returns: ReturnRequest[];
  /** Ids of orders cancelled in this session (overlaid onto order views). */
  cancelledOrderIds: string[];
}

interface StoreState {
  sessions: Map<string, Session>;
  /** Monotonic order number, mirrors the prototype's NW-10520+ sequence. */
  nextOrderNo: number;
  /** Monotonic RMA number for return requests. */
  nextReturnNo: number;
}

const globalStore = globalThis as unknown as { __nwStore?: StoreState };

const state: StoreState =
  globalStore.__nwStore ??
  (globalStore.__nwStore = {
    sessions: new Map(),
    nextOrderNo: 10520,
    nextReturnNo: 8001,
  });

// ── Sessions ────────────────────────────────────────────────────────────────

export function hasSession(id: string): boolean {
  return state.sessions.has(id);
}

export function getOrCreateSession(id: string): Session {
  let s = state.sessions.get(id);
  if (!s) {
    s = {
      id,
      user: null,
      cart: [],
      // Wishlist is a logged-in-only feature; a fresh session starts empty and
      // the API rejects wishlist reads/writes until a user is attached.
      wishlist: [],
      promoCode: null,
      orders: [],
      returns: [],
      cancelledOrderIds: [],
    };
    state.sessions.set(id, s);
  }
  return s;
}

export function newSessionId(): string {
  return randomUUID();
}

// ── Auth ──────────────────────────────────────────────────────────────────--

function initialsOf(name: string): string {
  return (
    name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U'
  );
}

/**
 * Demo login: any credentials succeed and sign you in as the returning user
 * (Alex Morgan) with full history. The typed email is substituted for display,
 * matching the prototype. The guest cart/wishlist on this session carry over.
 */
export function login(session: Session, email: string): User {
  const user: User = {
    ...demoUser,
    email: email || demoUser.email,
    addresses: demoUser.addresses.map((a) => ({ ...a })),
    cards: demoUser.cards.map((c) => ({ ...c })),
  };
  session.user = user;
  return user;
}

/** Demo signup: creates a fresh account (no history, empty address book). */
export function signup(session: Session, name: string, email: string): User {
  const fullName = name || 'New Member';
  const user: User = {
    id: 'u_' + randomUUID().slice(0, 8),
    name: fullName,
    email: email || 'you@example.com',
    initials: initialsOf(fullName),
    since: 'Just now',
    orders: 0,
    addresses: [],
    cards: [],
    isNew: true,
  };
  session.user = user;
  return user;
}

export function logout(session: Session): void {
  session.user = null;
}

// ── Cart ──────────────────────────────────────────────────────────────────--

function lineKey(productId: string, opt: string): string {
  return productId + '|' + opt;
}

export function addToCart(session: Session, productId: string, qty: number, opt: string): void {
  if (!getProduct(productId)) throw new Error('Unknown product: ' + productId);
  const lineId = lineKey(productId, opt);
  const existing = session.cart.find((l) => l.lineId === lineId);
  if (existing) {
    existing.qty += qty;
  } else {
    session.cart.push({ lineId, productId, qty, opt });
  }
}

export function updateCartQty(session: Session, lineId: string, qty: number): void {
  if (qty < 1) {
    session.cart = session.cart.filter((l) => l.lineId !== lineId);
    return;
  }
  const line = session.cart.find((l) => l.lineId === lineId);
  if (line) line.qty = qty;
}

export function removeCartLine(session: Session, lineId: string): void {
  session.cart = session.cart.filter((l) => l.lineId !== lineId);
}

export function setPromo(session: Session, code: string | null): void {
  session.promoCode = code ? code.toUpperCase() : null;
}

/** The cart as the lines pricing needs (unit price, qty, category). */
function pricingLines(session: Session): PricingLine[] {
  return session.cart
    .map((l) => {
      const p = getProduct(l.productId);
      return p ? { price: p.price, qty: l.qty, category: p.category } : null;
    })
    .filter((x): x is PricingLine => x !== null);
}

/**
 * Validate + apply a promo against the current cart. Returns the matched promo
 * on success, or a human reason on failure (unknown code, or the cart doesn't
 * meet the minimum spend yet). The route turns a failure into a 422.
 */
export function applyPromo(
  session: Session,
  code: string,
): { ok: true; promo: Promo } | { ok: false; reason: string } {
  const promo = getPromo(code);
  if (!promo) return { ok: false, reason: 'Invalid promo code.' };
  const evalR = evaluatePromo(promo, pricingLines(session));
  if (!evalR.eligible) {
    return { ok: false, reason: evalR.reason ?? 'Your cart does not qualify for this code yet.' };
  }
  setPromo(session, promo.code);
  return { ok: true, promo };
}

/** Build the enriched cart view (lines + product + authoritative totals). */
export function cartView(session: Session, method: ShippingMethod = 'standard'): Cart {
  const lines: CartLineView[] = session.cart
    .map((l) => {
      const product = getProduct(l.productId);
      if (!product) return null;
      return { ...l, product, lineTotal: round2(product.price * l.qty) };
    })
    .filter((x): x is CartLineView => x !== null);

  const plines = lines.map((l) => ({ price: l.product.price, qty: l.qty, category: l.product.category }));
  const count = lines.reduce((n, l) => n + l.qty, 0);

  const promo = getPromo(session.promoCode);
  const evalR = promo ? evaluatePromo(promo, plines) : null;
  const applied: AppliedPromo | null =
    promo && evalR
      ? {
          code: promo.code,
          title: promo.title,
          description: promo.description,
          eligible: evalR.eligible,
          discount: evalR.discount,
          freeShip: evalR.freeShip,
          reason: evalR.reason,
        }
      : null;

  return {
    lines,
    count,
    promoCode: session.promoCode,
    promo: applied,
    totals: computeTotals(plines, session.promoCode, method),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Wishlist ──────────────────────────────────────────────────────────────--

export function toggleWishlist(session: Session, productId: string): boolean {
  const has = session.wishlist.includes(productId);
  if (has) {
    session.wishlist = session.wishlist.filter((x) => x !== productId);
  } else {
    session.wishlist = [productId, ...session.wishlist];
  }
  return !has;
}

export function addWishlist(session: Session, productId: string): void {
  if (!session.wishlist.includes(productId)) session.wishlist = [productId, ...session.wishlist];
}

export function removeWishlist(session: Session, productId: string): void {
  session.wishlist = session.wishlist.filter((x) => x !== productId);
}

export function wishlistProducts(session: Session) {
  return session.wishlist.map((id) => getProduct(id)).filter(Boolean);
}

// ── Orders ────────────────────────────────────────────────────────────────--

export interface CheckoutInput {
  email: string;
  shippingMethod: ShippingMethod;
}

/**
 * Place an order from the current cart. Computes the authoritative total,
 * snapshots the cart into an order, clears the cart + promo, and returns it.
 */
export function placeOrder(session: Session, input: CheckoutInput): Order {
  if (session.cart.length === 0) throw new Error('Cart is empty');

  const { totals } = cartView(session, input.shippingMethod);
  const id = 'NW-' + state.nextOrderNo++;
  const email = input.email || session.user?.email || 'guest';

  const order: Order = {
    id,
    email,
    date: 'Jun 8, 2026',
    status: 'processing',
    statusLabel: 'Processing',
    total: totals.total,
    items: session.cart.map((l) => ({ productId: l.productId, qty: l.qty, opt: l.opt })),
    eta: 'Arrives Jun 10 – Jun 12',
    track: [
      { t: 'Order placed', d: 'Jun 8, just now', state: 'done' },
      { t: 'Payment confirmed', d: 'Jun 8, just now', state: 'done' },
      { t: 'Preparing your order', d: 'In progress', state: 'current' },
      { t: 'Shipped', d: 'Estimated Jun 9', state: 'pending' },
      { t: 'Out for delivery', d: 'Estimated Jun 11', state: 'pending' },
      { t: 'Delivered', d: 'Estimated Jun 11', state: 'pending' },
    ],
  };

  // Deplete the flash sale by what was actually bought (real "% claimed").
  for (const line of session.cart) recordFlashPurchase(line.productId, line.qty);

  session.orders.unshift(order);
  session.cart = [];
  session.promoCode = null;
  return order;
}

/** All orders visible to this session: ones placed here + the returning user's history. */
export function listOrders(session: Session): Order[] {
  const history =
    session.user && !session.user.isNew ? (demoHistoryOrders as Order[]) : [];
  return [...session.orders, ...history];
}

export function getOrder(session: Session, id: string): Order | undefined {
  return listOrders(session).find((o) => o.id === id);
}

/** Reorder: re-add a past order's items to the cart. Returns the matched order. */
export function reorder(session: Session, id: string): Order | undefined {
  const order = getOrder(session, id);
  if (!order) return undefined;
  for (const item of order.items) {
    if (getProduct(item.productId)) addToCart(session, item.productId, item.qty, item.opt);
  }
  return order;
}

// ── Returns ─────────────────────────────────────────────────────────────────

/** The reasons a visitor can pick when starting a return. */
export const RETURN_REASONS = [
  'Item arrived damaged',
  'Wrong item sent',
  'Not as described',
  'No longer needed',
  'Better price elsewhere',
];

const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Return requested',
  approved: 'Return approved',
  received: 'Item received',
  refunded: 'Refunded',
};

/** Only delivered orders can be returned (and only once). */
export function isReturnable(session: Session, order: Order): boolean {
  if (order.status !== 'delivered') return false;
  return !session.returns.some((r) => r.orderId === order.id);
}

/**
 * Start a return against a delivered order. Returns the created RMA on success,
 * or a human reason on failure (unknown order, not delivered, already returned).
 * The route turns a failure into a 4xx.
 */
export function startReturn(
  session: Session,
  orderId: string,
  reason: string,
): { ok: true; ret: ReturnRequest } | { ok: false; reason: string; status: number } {
  const order = getOrder(session, orderId);
  if (!order) return { ok: false, reason: 'Order not found.', status: 404 };
  if (order.status !== 'delivered') {
    return { ok: false, reason: 'Only delivered orders can be returned.', status: 422 };
  }
  if (session.returns.some((r) => r.orderId === orderId)) {
    return { ok: false, reason: 'A return has already been started for this order.', status: 409 };
  }
  const ret: ReturnRequest = {
    id: 'RMA-' + state.nextReturnNo++,
    orderId,
    date: 'Just now',
    reason: reason?.trim() || 'No longer needed',
    status: 'requested',
    statusLabel: RETURN_STATUS_LABEL.requested,
    refund: order.total,
  };
  session.returns.unshift(ret);
  return { ok: true, ret };
}

/** All return requests raised in this session, newest first. */
export function listReturns(session: Session): ReturnRequest[] {
  return session.returns;
}

// ── Cancellation ──────────────────────────────────────────────────────────--

/**
 * Apply this session's cancellations to an order *view*, without mutating the
 * underlying order (history orders are shared across sessions, so we overlay
 * the cancelled status rather than editing them in place).
 */
function withCancelOverlay(session: Session, order: Order): Order {
  return session.cancelledOrderIds.includes(order.id)
    ? { ...order, status: 'cancelled', statusLabel: 'Cancelled' }
    : order;
}

/**
 * Cancel an order that hasn't shipped yet. Returns the (overlaid) order on
 * success, or a human reason + status on failure.
 */
export function cancelOrder(
  session: Session,
  id: string,
): { ok: true; order: Order } | { ok: false; reason: string; status: number } {
  const order = getOrder(session, id);
  if (!order) return { ok: false, reason: 'Order not found.', status: 404 };
  if (session.cancelledOrderIds.includes(id)) {
    return { ok: false, reason: 'This order is already cancelled.', status: 409 };
  }
  if (order.status !== 'processing') {
    return { ok: false, reason: "Only orders that haven't shipped yet can be cancelled.", status: 422 };
  }
  session.cancelledOrderIds.push(id);
  return { ok: true, order: withCancelOverlay(session, order) };
}

/** Enrich an order with product data for the order/confirmation views. */
export function orderView(order: Order): OrderView {
  return {
    ...order,
    items: order.items
      .map((it) => {
        const product = getProduct(it.productId);
        if (!product) return null;
        return { ...it, product, lineTotal: round2(product.price * it.qty) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}

/** Order views for this session, with cancellations overlaid. */
export function listOrderViews(session: Session): OrderView[] {
  return listOrders(session).map((o) => orderView(withCancelOverlay(session, o)));
}

/** A single order view for this session, with cancellation overlaid. */
export function getOrderView(session: Session, id: string): OrderView | undefined {
  const o = getOrder(session, id);
  return o ? orderView(withCancelOverlay(session, o)) : undefined;
}

export { products };
