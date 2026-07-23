/**
 * Typed client for the storefront's own REST API (the Next.js route handlers).
 *
 * Every piece of catalog/cart/order data the UI shows flows through here — the
 * components hold no hardcoded data. All requests are same-origin and send the
 * session cookie (`credentials: 'same-origin'`).
 */
import type {
  Category,
  Product,
  ReviewSummary,
  Cart,
  Me,
  User,
  OrderView,
  ShippingMethod,
  SortKey,
  Voucher,
  FlashSaleView,
  ReturnRequest,
  StorePolicies,
} from './types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const post = (path: string, body?: unknown) =>
  ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

// ── Catalog ───────────────────────────────────────────────────────────────--

export interface ProductListParams {
  q?: string;
  /** A single slug or several; 'all' means no filter. */
  category?: string | string[];
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onSale?: boolean;
  sort?: SortKey;
  page?: number;
  limit?: number;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  brands: string[];
}

function toQuery(params: ProductListParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.category) {
    (Array.isArray(params.category) ? params.category : [params.category]).forEach((c) =>
      sp.append('category', c),
    );
  }
  params.brand?.forEach((b) => sp.append('brand', b));
  if (params.minPrice != null) sp.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) sp.set('maxPrice', String(params.maxPrice));
  if (params.minRating != null) sp.set('minRating', String(params.minRating));
  if (params.onSale) sp.set('onSale', 'true');
  if (params.sort) sp.set('sort', params.sort);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  getCategories: () => req<{ categories: Category[] }>('/api/categories'),

  getProducts: (params: ProductListParams = {}) =>
    req<ProductListResult>('/api/products' + toQuery(params)),

  getProduct: (id: string) =>
    req<{ product: Product; category: Category | null }>(`/api/products/${id}`),

  getReviews: (id: string) => req<ReviewSummary>(`/api/products/${id}/reviews`),

  getVouchers: () => req<{ vouchers: Voucher[] }>('/api/vouchers'),

  getFlash: () => req<FlashSaleView>('/api/flash'),

  getPolicies: () => req<StorePolicies>('/api/policies'),

  getRelated: (id: string) => req<{ products: Product[] }>(`/api/products/${id}/related`),

  // ── Auth ──────────────────────────────────────────────────────────────────
  me: () => req<{ user: Me }>('/api/auth/me'),
  login: (email: string, password = 'demo') =>
    req<{ user: User }>('/api/auth/login', post('/api/auth/login', { email, password })),
  signup: (name: string, email: string, password = 'demo') =>
    req<{ user: User }>('/api/auth/signup', post('/api/auth/signup', { name, email, password })),
  logout: () => req<{ user: null }>('/api/auth/logout', post('/api/auth/logout')),

  // ── Cart ──────────────────────────────────────────────────────────────────
  getCart: (method?: ShippingMethod) =>
    req<Cart>('/api/cart' + (method ? `?method=${method}` : '')),
  addCartItem: (productId: string, qty = 1, opt = '') =>
    req<Cart>('/api/cart/items', post('/api/cart/items', { productId, qty, opt })),
  updateCartItem: (lineId: string, qty: number) =>
    req<Cart>(`/api/cart/items/${encodeURIComponent(lineId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty }),
    }),
  removeCartItem: (lineId: string) =>
    req<Cart>(`/api/cart/items/${encodeURIComponent(lineId)}`, { method: 'DELETE' }),
  applyPromo: (code: string | null) =>
    req<Cart>('/api/cart/promo', post('/api/cart/promo', { code })),

  // ── Wishlist ────────────────────────────────────────────────────────────--
  getWishlist: () => req<{ productIds: string[]; products: Product[] }>('/api/wishlist'),
  addWishlist: (productId: string) =>
    req<{ productIds: string[]; products: Product[] }>(`/api/wishlist/${productId}`, { method: 'POST' }),
  removeWishlist: (productId: string) =>
    req<{ productIds: string[]; products: Product[] }>(`/api/wishlist/${productId}`, { method: 'DELETE' }),

  // ── Checkout & orders ─────────────────────────────────────────────────────
  checkout: (input: { email: string; shippingMethod: ShippingMethod }) =>
    req<{ order: OrderView }>('/api/checkout', post('/api/checkout', input)),
  getOrders: () => req<{ orders: OrderView[] }>('/api/orders'),
  getOrder: (id: string) => req<{ order: OrderView }>(`/api/orders/${id}`),
  reorder: (id: string) => req<{ cart: Cart }>(`/api/orders/${id}/reorder`, { method: 'POST' }),
  cancelOrder: (id: string) => req<{ order: OrderView }>(`/api/orders/${id}/cancel`, { method: 'POST' }),

  // ── Returns ─────────────────────────────────────────────────────────────--
  getReturns: () => req<{ returns: ReturnRequest[] }>('/api/returns'),
  startReturn: (orderId: string, reason: string) =>
    req<{ return: ReturnRequest }>('/api/returns', post('/api/returns', { orderId, reason })),
};
