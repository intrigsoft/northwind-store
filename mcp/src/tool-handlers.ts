import { StorefrontApiClient } from './api-client.js';

export interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

const ok = (data: unknown): ToolCallResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});
const err = (message: string): ToolCallResult => ({
  content: [{ type: 'text', text: `Error: ${message}` }],
  isError: true,
});

// Public origin of the storefront, used to build absolute image URLs the chat
// widget can load (the storefront's images are served as same-origin /api/images
// paths; the assistant runs in the widget, so it needs the full URL).
const PUBLIC_URL = process.env.NORTHWIND_PUBLIC_URL || process.env.NORTHWIND_API_URL || 'http://localhost:3010';

/** Absolute, chat-sized image URL for a product (or undefined). */
function imageUrl(p: any): string | undefined {
  const rel: string | undefined = p?.images?.[0];
  if (!rel) return undefined;
  const abs = rel.startsWith('http') ? rel : PUBLIC_URL + rel;
  // Down-size for inline chat thumbnails.
  return abs.replace(/([?&])w=\d+/, '$1w=320');
}

/** Trim a product to the fields the model needs; include an `image` URL so the
 *  assistant can embed product images. Page URLs are NOT returned here — the
 *  assistant builds them from the Navigation sitemap pattern (/p/{productId})
 *  using `id`, so route shape lives in one place (the sitemap), not the tools. */
function slimProduct(p: any) {
  if (!p) return p;
  return {
    id: p.id, title: p.title, brand: p.brand, category: p.category,
    price: p.price, compareAt: p.compareAt, rating: p.rating, reviews: p.reviews,
    colors: p.colors?.map((c: [string, string]) => c[0]) ?? null,
    sizes: p.sizes ?? null, stock: p.stock, sku: p.sku,
    image: imageUrl(p),
  };
}

function slimCart(cart: any) {
  if (!cart) return cart;
  return {
    count: cart.count,
    promoCode: cart.promoCode,
    promo: cart.promo,
    lines: (cart.lines ?? []).map((l: any) => ({
      lineId: l.lineId, productId: l.productId, title: l.product?.title,
      opt: l.opt, qty: l.qty, lineTotal: l.lineTotal,
    })),
    totals: cart.totals,
  };
}

function slimOrder(o: any) {
  if (!o) return o;
  return {
    id: o.id, date: o.date, status: o.status, statusLabel: o.statusLabel,
    total: o.total, eta: o.eta,
    items: (o.items ?? []).map((i: any) => ({
      productId: i.productId, title: i.product?.title, opt: i.opt, qty: i.qty, lineTotal: i.lineTotal,
    })),
    track: o.track,
  };
}

export class ToolHandlers {
  constructor(private api: StorefrontApiClient) {}

  async handle(name: string, args: Record<string, any>): Promise<ToolCallResult> {
    try {
      switch (name) {
        case 'search_products': return this.searchProducts(args);
        case 'get_product': return this.getProduct(args.productId);
        case 'get_reviews': return this.getReviews(args.productId);
        case 'get_related': return this.getRelated(args.productId);
        case 'get_store_policies': return this.getStorePolicies();
        case 'get_flash_sale': return this.getFlashSale();
        case 'get_cart': return this.getCart(args.shippingMethod);
        case 'add_to_cart': return this.addToCart(args);
        case 'update_cart_item': return this.updateCartItem(args.lineId, args.qty);
        case 'remove_cart_item': return this.removeCartItem(args.lineId);
        case 'list_vouchers': return this.listVouchers();
        case 'apply_promo': return this.applyPromo(args.code);
        case 'get_wishlist': return this.getWishlist();
        case 'add_to_wishlist': return this.wishlist('add', args.productId);
        case 'remove_from_wishlist': return this.wishlist('remove', args.productId);
        case 'list_orders': return this.listOrders();
        case 'get_order': return this.getOrder(args.orderId);
        case 'reorder': return this.reorder(args.orderId);
        case 'cancel_order': return this.cancelOrder(args.orderId);
        case 'get_profile': return this.getProfile();
        case 'list_returns': return this.listReturns();
        case 'start_return': return this.startReturn(args.orderId, args.reason);
        case 'preview_order': return this.previewOrder(args.shippingMethod);
        case 'place_order': return this.placeOrder(args);
        default: return err(`Unknown tool: ${name}`);
      }
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  private async searchProducts(args: Record<string, any>): Promise<ToolCallResult> {
    const params: Record<string, string | string[]> = {};
    if (args.query) params.q = String(args.query);
    if (args.category) params.category = String(args.category);
    if (args.brand) params.brand = [String(args.brand)];
    if (args.minPrice != null) params.minPrice = String(args.minPrice);
    if (args.maxPrice != null) params.maxPrice = String(args.maxPrice);
    if (args.minRating != null) params.minRating = String(args.minRating);
    if (args.onSale) params.onSale = 'true';
    if (args.sort) params.sort = String(args.sort);

    const r = await this.api.searchProducts(params);
    if (!r.success) return err(r.error!);
    const d = r.data;
    return ok({ count: d.total, products: (d.products ?? []).map(slimProduct) });
  }

  private async getProduct(productId: string): Promise<ToolCallResult> {
    if (!productId) return err('productId is required');
    const r = await this.api.getProduct(productId);
    if (!r.success) return err(r.error!);
    const p = r.data.product;
    return ok({
      ...slimProduct(p),
      description: p.description,
      specs: p.specs,
      freeShip: p.freeShip,
      category: r.data.category?.name ?? p.category,
    });
  }

  private async getReviews(productId: string): Promise<ToolCallResult> {
    if (!productId) return err('productId is required');
    const r = await this.api.getReviews(productId);
    if (!r.success) return err(r.error!);
    const d = r.data;
    return ok({
      rating: d.rating,
      total: d.total,
      distribution: d.distribution,
      reviews: (d.reviews ?? []).map((rv: any) => ({
        name: rv.name, rating: rv.rating, title: rv.title, body: rv.body, verified: rv.verified, date: rv.date,
      })),
    });
  }

  private async getRelated(productId: string): Promise<ToolCallResult> {
    if (!productId) return err('productId is required');
    const r = await this.api.getRelated(productId);
    if (!r.success) return err(r.error!);
    return ok({ products: (r.data.products ?? []).map(slimProduct) });
  }

  private async getStorePolicies(): Promise<ToolCallResult> {
    const r = await this.api.getPolicies();
    return r.success ? ok(r.data) : err(r.error!);
  }

  private async getFlashSale(): Promise<ToolCallResult> {
    const r = await this.api.getFlashSale();
    if (!r.success) return err(r.error!);
    const d = r.data;
    return ok({
      endsAt: d.endsAt,
      secondsLeft: d.secondsLeft,
      items: (d.items ?? []).map((it: any) => ({
        ...slimProduct(it.product),
        price: it.price,
        compareAt: it.compareAt,
        pctClaimed: it.pctClaimed,
        remaining: it.remaining,
        soldOut: it.soldOut,
      })),
    });
  }

  private async getCart(shippingMethod?: string): Promise<ToolCallResult> {
    const r = await this.api.getCart(shippingMethod);
    return r.success ? ok(slimCart(r.data)) : err(r.error!);
  }

  private async addToCart(args: Record<string, any>): Promise<ToolCallResult> {
    if (!args.productId) return err('productId is required');
    const r = await this.api.addToCart(args.productId, Math.max(1, Number(args.qty) || 1), args.opt ?? '');
    return r.success ? ok({ added: true, cart: slimCart(r.data) }) : err(r.error!);
  }

  private async updateCartItem(lineId: string, qty: number): Promise<ToolCallResult> {
    if (!lineId) return err('lineId is required');
    const r = await this.api.updateCartItem(lineId, Number(qty));
    return r.success ? ok({ updated: true, cart: slimCart(r.data) }) : err(r.error!);
  }

  private async removeCartItem(lineId: string): Promise<ToolCallResult> {
    if (!lineId) return err('lineId is required');
    const r = await this.api.removeCartItem(lineId);
    return r.success ? ok({ removed: true, cart: slimCart(r.data) }) : err(r.error!);
  }

  private async listVouchers(): Promise<ToolCallResult> {
    const r = await this.api.getVouchers();
    return r.success ? ok({ vouchers: r.data.vouchers ?? [] }) : err(r.error!);
  }

  private async applyPromo(code: string): Promise<ToolCallResult> {
    const r = await this.api.applyPromo(code ?? '');
    return r.success ? ok({ applied: true, cart: slimCart(r.data) }) : err(r.error!);
  }

  private async getWishlist(): Promise<ToolCallResult> {
    const r = await this.api.getWishlist();
    if (!r.success) return err(r.error!);
    return ok({ products: (r.data.products ?? []).map(slimProduct) });
  }

  private async wishlist(action: 'add' | 'remove', productId: string): Promise<ToolCallResult> {
    if (!productId) return err('productId is required');
    const r = action === 'add'
      ? await this.api.addToWishlist(productId)
      : await this.api.removeFromWishlist(productId);
    if (!r.success) return err(r.error!);
    return ok({ [action === 'add' ? 'saved' : 'removed']: true, productIds: r.data.productIds });
  }

  private async listOrders(): Promise<ToolCallResult> {
    const r = await this.api.listOrders();
    if (!r.success) return err(r.error!);
    return ok({ orders: (r.data.orders ?? []).map(slimOrder) });
  }

  private async getOrder(orderId: string): Promise<ToolCallResult> {
    if (!orderId) return err('orderId is required');
    const r = await this.api.getOrder(orderId);
    return r.success ? ok(slimOrder(r.data.order)) : err(r.error!);
  }

  private async reorder(orderId: string): Promise<ToolCallResult> {
    if (!orderId) return err('orderId is required');
    const r = await this.api.reorder(orderId);
    return r.success ? ok({ reordered: true, cart: slimCart(r.data.cart) }) : err(r.error!);
  }

  private async cancelOrder(orderId: string): Promise<ToolCallResult> {
    if (!orderId) return err('orderId is required');
    const r = await this.api.cancelOrder(orderId);
    return r.success ? ok({ cancelled: true, order: slimOrder(r.data.order) }) : err(r.error!);
  }

  private async getProfile(): Promise<ToolCallResult> {
    const r = await this.api.getMe();
    if (!r.success) return err(r.error!);
    const u = r.data.user;
    if (!u) return err('Not signed in — ask the visitor to sign in to view their profile.');
    return ok({ id: u.id, name: u.name, email: u.email, since: u.since, orders: u.orders });
  }

  private async listReturns(): Promise<ToolCallResult> {
    const r = await this.api.getReturns();
    return r.success ? ok({ returns: r.data.returns ?? [] }) : err(r.error!);
  }

  private async startReturn(orderId: string, reason: string): Promise<ToolCallResult> {
    if (!orderId) return err('orderId is required');
    const r = await this.api.startReturn(orderId, reason ?? '');
    return r.success ? ok({ started: true, return: r.data.return }) : err(r.error!);
  }

  private async previewOrder(shippingMethod?: string): Promise<ToolCallResult> {
    const r = await this.api.getCart(shippingMethod);
    if (!r.success) return err(r.error!);
    const cart = r.data;
    if (!cart.lines?.length) return err('The cart is empty — add items before previewing an order.');
    return ok({
      shippingMethod: shippingMethod ?? 'standard',
      lines: (cart.lines ?? []).map((l: any) => ({
        title: l.product?.title, opt: l.opt, qty: l.qty, lineTotal: l.lineTotal,
      })),
      promo: cart.promo,
      totals: cart.totals,
      willCharge: cart.totals?.total,
    });
  }

  private async placeOrder(args: Record<string, any>): Promise<ToolCallResult> {
    const r = await this.api.checkout({
      email: args.email ?? '',
      shippingMethod: args.shippingMethod ?? 'standard',
    });
    return r.success ? ok({ placed: true, order: slimOrder(r.data.order) }) : err(r.error!);
  }
}
