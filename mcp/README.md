# Northwind MCP Server

A **thin, session-authorized MCP adapter** over the Northwind storefront's REST
API. It surfaces the shopping journey as assistant tools (`search_products`,
`add_to_cart`, `place_order`, …) and is the connector Dioschub calls on behalf of
the current visitor.

It adds **no privileges of its own**: every tool replays the visitor's own
storefront session cookie (`nw_sid`) against the storefront API, so the assistant
can only see and do what the signed-in (or guest) visitor can. The model never
sees the cookie — it rides along on each tool call's **HTTP request headers**
(credential-blind, MCP spec 2025-11-25).

```
Dioschub ──(tool call, HTTP Cookie header)──▶ Northwind MCP ──(Cookie: nw_sid=…)──▶ storefront /api/*
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
`http://localhost:3011/mcp`, Streamable HTTP). Dioschub forwards the visitor's
bound auth artifact (the `nw_sid` cookie captured by the storefront's
`/api/diosc/bind`) as HTTP headers on each tool call, and applies the role's
approval policy to destructive tools.

## Endpoints

| Path | Purpose |
| --- | --- |
| `POST /mcp` | MCP Streamable HTTP transport |
| `POST /api/resolve-user` | Identity resolver (replays the cookie to `/api/auth/me`) |
| `GET /api/tools` · `POST /api/tools/call` | Local introspection / testing |
| `GET /health` · `GET /` | Health / info |
