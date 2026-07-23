# Northwind MCP Server

A **thin, session-authorized MCP adapter** over the Northwind storefront's REST
API. It surfaces the shopping journey as assistant tools (`search_products`,
`add_to_cart`, `place_order`, …) and is the connector Dioschub calls on behalf of
the current visitor.

It adds **no privileges of its own**: every tool replays the visitor's own
storefront session cookie (`nw_sid`) against the storefront API, so the assistant
can only see and do what the signed-in (or guest) visitor can — and it is also
the **token issuer** (MCP authorization spec 2025-11-25): at bind time it caches
the visitor's session cookie and mints a short-lived, audience-bound HS256 JWT
referencing it. The hub holds only that JWT; each tool call presents it as
`Authorization: Bearer`, and this server exchanges it for the cached cookie.
The model never sees either token, and no token is passed through upstream.

```
storefront ──(identity + cookie)──▶ POST /auth/bind ──(JWT artifact)──▶ hub
Dioschub ──(tool call, Bearer JWT)──▶ Northwind MCP ──(Cookie: nw_sid=…)──▶ storefront /api/*
```

## Tools

| Tool | Route | Notes |
| --- | --- | --- |
| `search_products` | `GET /api/products` | guest OK |
| `get_product` | `GET /api/products/:id` | guest OK |
| `get_cart` | `GET /api/cart` | |
| `add_to_cart` | `POST /api/cart/items` | |
| `update_cart_item` | `PATCH /api/cart/items/:lineId` | qty 0 removes |
| `remove_cart_item` | `DELETE /api/cart/items/:lineId` | |
| `apply_promo` | `POST /api/cart/promo` | e.g. `NORTH10` |
| `get_wishlist` / `add_to_wishlist` / `remove_from_wishlist` | `/api/wishlist[...]` | |
| `list_orders` / `get_order` | `GET /api/orders[/:id]` | auth; `get_order` = tracking |
| `reorder` | `POST /api/orders/:id/reorder` | |
| `get_profile` | `GET /api/auth/me` | auth |
| `place_order` | `POST /api/checkout` | **destructive — approval-gated** |

Tools carry MCP `annotations`: reads are `readOnlyHint`, mutations set
`destructiveHint`. `place_order` is flagged destructive so the Dioschub approval
workflow can require explicit confirmation before it runs — enforcement lives in
the hub/role config, not here.

## Run

```bash
cd mcp
npm install
cp .env.example .env          # MCP_PORT=3011, NORTHWIND_API_URL=http://localhost:3010
npm run dev                   # Streamable HTTP at http://localhost:3011/mcp
```

The storefront (repo root, port 3010) must be running.

## Try it without Dioschub

List tools, then call one directly (pass a real `nw_sid` cookie to act as a
specific session — grab one from the browser, or omit it for an ephemeral guest):

```bash
curl -s localhost:3011/api/tools | jq '.tools[].name'

curl -s localhost:3011/api/tools/call \
  -H 'content-type: application/json' \
  -d '{"name":"search_products","arguments":{"query":"headphones","maxPrice":150}}' | jq

curl -s localhost:3011/api/tools/call \
  -H 'content-type: application/json' \
  -d '{"name":"add_to_cart","arguments":{"productId":"p1000","opt":"Midnight"},"cookie":"nw_sid=<from-browser>"}' | jq
```

## Wiring into Dioschub

Register this server as an MCP connector in the Dioschub admin portal (URL
`http://localhost:3011/mcp`, Streamable HTTP, no static auth). Dioschub forwards
the session's bound auth artifact — the JWT this server issued at bind time — as
the `Authorization` header on each tool call, and applies the role's approval
policy to destructive tools. Configure `mcp/.env` with the hub URL + an admin
`auth:bind` capability key (this server performs the hub bind) and the two
secrets (`MCP_JWT_SECRET`, `MCP_BIND_SECRET`).

## Endpoints

| Path | Purpose |
| --- | --- |
| `POST /mcp` | MCP Streamable HTTP transport (tool calls require the issued Bearer JWT; invalid/expired → 401 + `WWW-Authenticate`) |
| `POST /auth/bind` | Storefront hands over identity + session cookie; this server mints the JWT and registers the session with the hub |
| `POST /api/resolve-user` | Identity resolver (replays the cookie to `/api/auth/me`) |
| `GET /api/tools` · `POST /api/tools/call` | Local introspection / testing |
| `GET /health` · `GET /` | Health / info |
