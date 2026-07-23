# Northwind — DioscHub configuration (free tier)

The complete, exact hub configuration for the Northwind assistant. Everything
here fits the **free tier**: one assistant, one MCP server, two roles, one model.
There is no config-import file — config export/import rides on the admin API, a
Pro feature — so this is configured by hand in the admin portal, which is what a
free-tier deployment does anyway. The DioscHub tutorial walks through it; this
file is the authoritative reference.

## 1. Assistant

| Field | Value |
| --- | --- |
| Name | `Northwind Shopper` |
| Model | one model config (see §4) |
| System prompt | the contents of [`ASSISTANT-PROMPT.md`](./ASSISTANT-PROMPT.md) |
| Embed key | generate one — it becomes `NEXT_PUBLIC_DIOSC_API_KEY` (public, browser-safe) |

## 2. MCP server

**MCP servers → Add:**

| Field | Value |
| --- | --- |
| Name | `northwind-storefront` |
| Transport | Streamable HTTP |
| Server URL | `http://localhost:3011/mcp` (or the deployed MCP URL) |
| Auth config | **empty** (credential-less = BYOA conduit; the hub forwards the session's bound JWT as `Authorization`) |

After saving, **Tools → Refresh** to discover the 24 tools.

## 3. Roles (2)

### `shopper` — authenticated visitors

Set its id as the storefront's `DIOSC_HUB_ROLE_ID` (e.g. `role-shopper`).

- **Tools:** all 24 `northwind-storefront` tools.
- **Approval required:** `place_order`, `cancel_order`, `remove_cart_item`.
- **No approval:** everything else (reads, `add_to_cart`, `update_cart_item`,
  `apply_promo`, wishlist add/remove, `reorder`, `start_return`, `preview_order`).

### `anonymous` — guests (pre-sign-in)

- **Tools (read + cart only):** `search_products`, `get_product`, `get_reviews`,
  `get_related`, `get_store_policies`, `get_flash_sale`, `list_vouchers`,
  `get_cart`, `add_to_cart`, `update_cart_item`, `remove_cart_item`, `apply_promo`.
- **Not granted:** `place_order`, `list_orders`, `get_order`, `reorder`,
  `cancel_order`, `get_profile`, `list_returns`, `start_return`, `preview_order`.
- **Approval required:** `remove_cart_item`.

On sign-in the kit re-binds the same connection; the hub promotes the session
`anonymous → shopper` in place (cart + conversation carry over).

## 4. Model

**Models → Add** (free tier allows one):

| Field | Value |
| --- | --- |
| Provider | your choice |
| Model | `gpt-5-mini` (good cost/latency for a shopping assistant) |
| API key | **your own** provider key (stored on the hub; never sent to the browser or the model context) |

## 5. Sitemap (optional — enables the `navigate` tool)

Add the storefront routes (free tier allows up to 10):

```
/            /search      /p/:id      /cart
/checkout    /orders      /wishlist   /account
```

The hub only emits navigation paths it validated against this list.

## Tool reference

Destructive tools (`destructiveHint: true`) — candidates for an approval policy:
`remove_cart_item`, `cancel_order`, `place_order`. Read tools carry
`readOnlyHint: true`; additive mutations (`add_to_cart`, `apply_promo`,
`add_to_wishlist`, …) carry neither. See `mcp/src/tools.ts` on the `production`
branch for the full annotated catalog.
