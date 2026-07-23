import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Northwind storefront tools.
 *
 * Each maps to a storefront REST route and runs under the visitor's forwarded
 * session — the assistant gets no more power than the signed-in user has.
 *
 * `annotations` carry MCP-standard hints. Reads are `readOnlyHint: true`;
 * mutations set `destructiveHint`. `place_order` is flagged destructive so the
 * Dioschub approval workflow can require explicit user confirmation before it
 * fires (BACKEND.md §5 "sensitive actions should be confirmable"). Approval
 * enforcement lives in the hub/role config, not here.
 */
export const northwindTools: Tool[] = [
  // ── Catalog (guest OK) ────────────────────────────────────────────────────
  {
    name: 'search_products',
    description:
      'Search and filter the product catalogue. Use for "show me wireless headphones under $100", ' +
      '"on-sale running shoes", etc. Returns matching products with id, title, brand, price and rating.',
    annotations: { title: 'Search products', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search across title, brand and category.' },
        category: {
          type: 'string',
          enum: ['electronics', 'home', 'fashion', 'beauty', 'sports'],
          description: 'Restrict to a category slug.',
        },
        brand: { type: 'string', description: 'Restrict to a brand name.' },
        minPrice: { type: 'number', description: 'Minimum price.' },
        maxPrice: { type: 'number', description: 'Maximum price.' },
        minRating: { type: 'number', description: 'Minimum average rating (e.g. 4 or 4.5).' },
        onSale: { type: 'boolean', description: 'Only products currently on sale.' },
        sort: {
          type: 'string',
          enum: ['featured', 'low', 'high', 'rating', 'reviews'],
          description: 'Sort order: featured, price low→high, price high→low, top rated, most reviewed.',
        },
      },
    },
  },
  {
    name: 'get_product',
    description: 'Get full detail for one product: price, description, specs, colours, sizes, stock and rating.',
    annotations: { title: 'Get product', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'Product id, e.g. "p1000".' } },
      required: ['productId'],
    },
  },
  {
    name: 'get_reviews',
    description:
      'Get customer reviews for a product: the average rating, total count, star distribution and ' +
      'individual review text. Use to answer "is this any good?" or to summarise what shoppers say.',
    annotations: { title: 'Get reviews', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'Product id to fetch reviews for.' } },
      required: ['productId'],
    },
  },
  {
    name: 'get_related',
    description: 'Get products related to a given product (same category) — use for "show me alternatives" or cross-sell.',
    annotations: { title: 'Get related products', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'Product id to find alternatives for.' } },
      required: ['productId'],
    },
  },
  {
    name: 'get_store_policies',
    description:
      'Get the store\'s policies: free-shipping threshold, the shipping methods with prices and delivery ' +
      'estimates, the returns window, accepted payment methods and tax rate. Use to answer "do you offer ' +
      'free shipping?", "what\'s your return policy?", "how fast is delivery?" — never guess these.',
    annotations: { title: 'Store policies', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },

  {
    name: 'get_flash_sale',
    description:
      'Get the live, time-boxed flash sale: the curated discounted products, how long the sale runs ' +
      '(secondsLeft / endsAt), and each item\'s claimed stock and remaining units. Use to answer ' +
      '"what\'s on flash sale?", "how long is the deal on?", or "is X about to sell out?".',
    annotations: { title: 'Flash sale', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },

  // ── Cart ──────────────────────────────────────────────────────────────────
  {
    name: 'get_cart',
    description:
      "Get the visitor's current cart: line items, quantities, options and the computed totals. " +
      'Totals include `amountToFreeShipping` (how much more to spend for free standard shipping). ' +
      'Pass `shippingMethod` to preview totals for express/next-day delivery.',
    annotations: { title: 'Get cart', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        shippingMethod: {
          type: 'string',
          enum: ['standard', 'express', 'nextday'],
          description: 'Optional — preview the totals for this delivery method (defaults to standard).',
        },
      },
    },
  },
  {
    name: 'add_to_cart',
    description:
      'Add a product to the cart. If the product has sizes/colours, pass the chosen option in `opt` ' +
      '(e.g. "Midnight", "Black · 45mm"). Quantities merge with an existing matching line.',
    annotations: { title: 'Add to cart', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product id to add.' },
        qty: { type: 'number', description: 'Quantity (default 1).' },
        opt: { type: 'string', description: 'Selected option label (colour/size), if any.' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'update_cart_item',
    description: 'Change the quantity of a cart line. A quantity of 0 removes the line.',
    annotations: { title: 'Update cart item', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        lineId: { type: 'string', description: 'Cart line id (productId|option), from get_cart.' },
        qty: { type: 'number', description: 'New quantity (0 removes the line).' },
      },
      required: ['lineId', 'qty'],
    },
  },
  {
    name: 'remove_cart_item',
    description: 'Remove a line from the cart.',
    annotations: { title: 'Remove cart item', readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { lineId: { type: 'string', description: 'Cart line id to remove, from get_cart.' } },
      required: ['lineId'],
    },
  },
  {
    name: 'list_vouchers',
    description:
      'List the store\'s available vouchers / promo codes with their discount, scope and minimum spend. ' +
      'Use this to answer "what coupons are available?" or to choose a code to apply with apply_promo.',
    annotations: { title: 'List vouchers', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'apply_promo',
    description:
      'Apply a voucher / promo code to the cart. Call list_vouchers first to see valid codes ' +
      '(e.g. NORTH10, TECH15, FREESHIP, GLOW20) and their conditions. If the cart doesn\'t meet a code\'s ' +
      'minimum spend or category, the call returns an error explaining what\'s needed. Pass an empty code to clear the applied promo.',
    annotations: { title: 'Apply promo', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Promo code to apply (empty string clears the current promo).' } },
      required: ['code'],
    },
  },

  // ── Wishlist ──────────────────────────────────────────────────────────────
  {
    name: 'get_wishlist',
    description: "Get the visitor's saved (wishlisted) products.",
    annotations: { title: 'Get wishlist', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_to_wishlist',
    description: 'Save a product to the wishlist.',
    annotations: { title: 'Add to wishlist', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'Product id to save.' } },
      required: ['productId'],
    },
  },
  {
    name: 'remove_from_wishlist',
    description: 'Remove a product from the wishlist.',
    annotations: { title: 'Remove from wishlist', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'Product id to remove.' } },
      required: ['productId'],
    },
  },

  // ── Orders (auth required) ────────────────────────────────────────────────
  {
    name: 'list_orders',
    description: "List the signed-in visitor's orders with status and totals. Requires the visitor to be signed in.",
    annotations: { title: 'List orders', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_order',
    description:
      'Get one order with its full delivery tracking timeline (also use this to "track my order"). ' +
      'Requires the visitor to be signed in (or to own the guest order in this session).',
    annotations: { title: 'Get / track order', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'Order id, e.g. "NW-10510".' } },
      required: ['orderId'],
    },
  },
  {
    name: 'reorder',
    description: '"Buy again": re-add the items from a past order to the cart.',
    annotations: { title: 'Reorder', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'Order id to reorder.' } },
      required: ['orderId'],
    },
  },
  {
    name: 'cancel_order',
    description:
      'Cancel an order that has not shipped yet (status "processing"). Orders already in transit or ' +
      'delivered cannot be cancelled — use start_return for delivered orders instead. Confirm with the ' +
      'visitor before cancelling.',
    annotations: { title: 'Cancel order', readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'Order id to cancel, e.g. "NW-10510".' } },
      required: ['orderId'],
    },
  },
  {
    name: 'get_profile',
    description: "Get the signed-in visitor's profile (name, email, since, order count). Requires sign-in.",
    annotations: { title: 'Get profile', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },

  // ── Returns ───────────────────────────────────────────────────────────────
  {
    name: 'list_returns',
    description: "List the return/refund requests the visitor has raised, with their RMA id, status and refund amount.",
    annotations: { title: 'List returns', readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'start_return',
    description:
      'Start a return for a DELIVERED order (use get_order/list_orders to confirm status first). ' +
      'Only delivered orders can be returned, and only once each. Returns the created RMA with its ' +
      'refund amount. The cart is untouched.',
    annotations: { title: 'Start a return', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The delivered order to return, e.g. "NW-10472".' },
        reason: { type: 'string', description: 'Why it\'s being returned (e.g. "Item arrived damaged"). Optional.' },
      },
      required: ['orderId'],
    },
  },

  // ── Checkout (sensitive — should be approval-gated) ───────────────────────
  {
    name: 'preview_order',
    description:
      'Preview exactly what placing the order will do BEFORE charging: the line items, the chosen ' +
      'shipping method, and the authoritative totals (subtotal, discount, shipping, tax and the final ' +
      'amount to charge). Always call this and show it to the visitor for confirmation before place_order.',
    annotations: { title: 'Preview order', readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        shippingMethod: {
          type: 'string',
          enum: ['standard', 'express', 'nextday'],
          description: 'Delivery method to price the preview against. Defaults to standard.',
        },
      },
    },
  },
  {
    name: 'place_order',
    description:
      'Place an order for everything currently in the cart and charge the visitor. ' +
      'THIS IS IRREVERSIBLE and spends money. ALWAYS call preview_order first and get the visitor\'s ' +
      'explicit confirmation; this action is approval-gated, so the user may be asked to approve it. ' +
      'Guest checkout is allowed if an email is provided. The total is computed server-side.',
    annotations: { title: 'Place order', readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email for the order (required for guest checkout).' },
        shippingMethod: {
          type: 'string',
          enum: ['standard', 'express', 'nextday'],
          description: 'Delivery method. Defaults to standard.',
        },
      },
    },
  },
];
