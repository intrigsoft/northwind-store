/**
 * Storefront API client.
 *
 * A thin wrapper over the Northwind storefront's REST API (the Next.js app).
 * Every request replays the visitor's forwarded session cookie, so calls are
 * authorized by the storefront exactly as if the visitor made them — the MCP
 * server adds no privileges of its own.
 */
import {
  RequestContext,
  getForwardHeaders,
  getCookieHeader,
} from './request-context.js';

const API_BASE = process.env.NORTHWIND_API_URL || 'http://localhost:3010';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class StorefrontApiClient {
  private context: RequestContext = { headers: {}, cookies: {} };

  setContext(context: RequestContext) {
    this.context = context;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      // Forward non-hop-by-hop headers, then attach a single Cookie header
      // (the session artifact) — avoid duplicating any forwarded cookie header.
      const forward = getForwardHeaders(this.context);
      delete forward['cookie'];
      delete forward['Cookie'];
      Object.assign(headers, forward);

      const cookie = getCookieHeader(this.context);
      if (cookie) headers['cookie'] = cookie;

      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { success: false, error: body.error || `API error ${res.status}`, status: res.status };
      }
      if (res.status === 204) return { success: true, status: 204 };
      return { success: true, data: (await res.json()) as T, status: res.status };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private body(method: string, data: unknown): RequestInit {
    return { method, body: JSON.stringify(data) };
  }

  // ── Identity ────────────────────────────────────────────────────────────--
  getMe() {
    return this.request<any>('/api/auth/me');
  }

  // ── Catalog (public) ────────────────────────────────────────────────────--
  searchProducts(params: Record<string, string | string[]>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
      else if (v != null && v !== '') sp.set(k, v);
    }
    const q = sp.toString();
    return this.request<any>(`/api/products${q ? `?${q}` : ''}`);
  }
  getProduct(id: string) {
    return this.request<any>(`/api/products/${encodeURIComponent(id)}`);
  }
  getReviews(id: string) {
    return this.request<any>(`/api/products/${encodeURIComponent(id)}/reviews`);
  }
  getVouchers() {
    return this.request<any>('/api/vouchers');
  }
  getFlashSale() {
    return this.request<any>('/api/flash');
  }
  getPolicies() {
    return this.request<any>('/api/policies');
  }
  getRelated(id: string) {
    return this.request<any>(`/api/products/${encodeURIComponent(id)}/related`);
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  getCart(method?: string) {
    return this.request<any>('/api/cart' + (method ? `?method=${encodeURIComponent(method)}` : ''));
  }
  addToCart(productId: string, qty: number, opt: string) {
    return this.request<any>('/api/cart/items', this.body('POST', { productId, qty, opt }));
  }
  updateCartItem(lineId: string, qty: number) {
    return this.request<any>(`/api/cart/items/${encodeURIComponent(lineId)}`, this.body('PATCH', { qty }));
  }
  removeCartItem(lineId: string) {
    return this.request<any>(`/api/cart/items/${encodeURIComponent(lineId)}`, { method: 'DELETE' });
  }
  applyPromo(code: string) {
    return this.request<any>('/api/cart/promo', this.body('POST', { code }));
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────
  getWishlist() {
    return this.request<any>('/api/wishlist');
  }
  addToWishlist(productId: string) {
    return this.request<any>(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'POST' });
  }
  removeFromWishlist(productId: string) {
    return this.request<any>(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
  }

  // ── Orders & checkout ─────────────────────────────────────────────────────
  listOrders() {
    return this.request<any>('/api/orders');
  }
  getOrder(id: string) {
    return this.request<any>(`/api/orders/${encodeURIComponent(id)}`);
  }
  reorder(id: string) {
    return this.request<any>(`/api/orders/${encodeURIComponent(id)}/reorder`, { method: 'POST' });
  }
  cancelOrder(id: string) {
    return this.request<any>(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  }
  checkout(input: { email: string; shippingMethod: string }) {
    return this.request<any>('/api/checkout', this.body('POST', input));
  }

  // ── Returns ─────────────────────────────────────────────────────────────--
  getReturns() {
    return this.request<any>('/api/returns');
  }
  startReturn(orderId: string, reason: string) {
    return this.request<any>('/api/returns', this.body('POST', { orderId, reason }));
  }
}
