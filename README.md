# Northwind — Next.js Marketplace Storefront (Dioschub demo)

> **You are on `production` — the finished integration.** This branch is the
> complete product: storefront + embedded DioscHub assistant + MCP connector.
> CI and the live demo (<https://northwind-staging.up.railway.app>) run from
> here. The tutorial *starting point* (the same storefront with no AI
> integration) is the [`main`](../../tree/main) branch.
>
> Requires DioscHub ≥ 0.1.1-rc.23.

Northwind is a responsive, multi-page eCommerce storefront built as a **demo host
application for Dioschub**. It is a single **Next.js 15 (App Router) full-stack
app**: the same project serves the UI *and* the REST backend (via route handlers),
which also makes it a working example of embedding the Dioschub assistant inside
**Next.js**.

It implements the full shopping journey — browse → product → cart → checkout →
orders — on a real **anonymous → authenticated** session model, which is the
surface Dioschub plugs into: browse as a guest, sign in mid-session, and the
assistant operates *as the logged-in user* under their permissions.

> Recreated from a static HTML design handoff. The CSS design system is lifted
> nearly verbatim; everything else is a fresh TypeScript implementation.

## Key property: the frontend hardcodes **no** data

Every piece of catalog, cart, order, and **image** data comes from the backend:

- Products, categories, reviews, and search/filter results are served by the
  Next.js route handlers under `app/api/*`.
- **Images stream through the backend** (`/api/images/[key]`) — the client bundle
  contains no product data and no upstream image URLs. The components render
  whatever `/api/...` returns.
- The cart, wishlist, orders, and current user live **server-side**, keyed by an
  httpOnly session cookie.

The seed data lives only on the server (`server/catalog.ts`) and is never imported
by a client component.

## Stack

- **Next.js 15** App Router, **React 19**, **TypeScript**
- Backend = **Next.js route handlers** + an in-memory store (the demo "database")
- **`@intrigsoft/dioschub-client`** for the embedded assistant
- Plain CSS design system (no Tailwind/preprocessor) — `app/globals.css`

## Getting started

```bash
# 1. Build the vendored client SDK (file: dep — not published to npm yet;
#    vendored snapshot of intrigsoft/diosc-ai modules/client)
cd vendor/dioschub-client && npm install && npm run build && cd ../..

# 2. Install + run the storefront
npm install

# optional — only needed to embed the assistant
cp .env.example .env.local      # then fill in the Dioschub values

npm run dev                     # http://localhost:3010
```

The store is fully functional **without** any Dioschub configuration — the
assistant simply isn't mounted until you set `NEXT_PUBLIC_DIOSC_API_KEY`.

### Environment variables

| Variable | Side | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_DIOSC_BACKEND_URL` | client | Dioschub hub URL the kit loads/connects to (default `http://localhost:3333`) |
| `NEXT_PUBLIC_DIOSC_API_KEY` | client | Embed API key from the Dioschub admin portal. Blank ⇒ no assistant |
| `NEXT_PUBLIC_DIOSC_ASSISTANT_ID` | client | Assistant to converse with (optional) |
| `DIOSC_HUB_BACKEND_URL` | server | Hub URL the `/api/diosc/bind` endpoint forwards to |
| `DIOSC_HUB_API_KEY` | server | Host deploy-time secret for binding. **Never exposed to the browser** |
| `DIOSC_HUB_ROLE_ID` | server | Dioschub Role the storefront's users map to |

## Architecture

```
app/
  api/                      ← the backend (Next.js route handlers)
    categories/             GET    list categories (+ counts)
    products/               GET    search / filter / sort
    products/[id]/          GET    detail · /reviews · /related
    images/[key]/           GET    image proxy (streams the upstream CDN)
    auth/                   POST   login · signup · logout · GET me
    cart/                   GET cart · items (POST/PATCH/DELETE) · promo
    wishlist/               GET · POST/DELETE [productId]
    checkout/               POST   place order (guest checkout allowed)
    orders/                 GET list · [id] · [id]/reorder
    diosc/bind/             POST   host-side Dioschub bind endpoint
  (pages)                   home · c/[slug] · search · p/[id] · cart ·
                            checkout · confirm/[id] · orders · wishlist · account
server/                     ← server-only modules (never imported by the client)
  catalog.ts                seed products/categories/reviews/demo user
  store.ts                  in-memory sessions, carts, wishlists, orders
  pricing.ts                authoritative shipping / tax / promo rules
  session.ts                httpOnly session-cookie plumbing
  queries.ts                search / filter / sort
components/                 ← client UI (StoreProvider context + views)
lib/                        ← typed API client, shared types, formatting
mcp/                        ← MCP connector (separate package; see mcp/README.md)
```

### Sessions & the anonymous → authenticated flow

Every visitor gets an opaque httpOnly `nw_sid` cookie. The cookie carries **no
identity** — it just keys the server-side session (cart, wishlist, auth state).

- **Guest**: browses, builds a cart and wishlist tied to the session.
- **Sign in / sign up mid-session**: a user is attached to the **same** session,
  so the guest's cart and wishlist carry over automatically — no separate merge
  step. (Demo auth: any credentials sign you in as the returning user "Alex
  Morgan"; sign-up creates a fresh account.)
- **Guest checkout** is allowed; the confirmation page nudges account creation.
- **Sign out** returns to a fresh guest on the same session.

### Server-authoritative pricing

Totals returned by the cart/checkout endpoints are always computed on the server
(`server/pricing.ts`): free shipping ≥ $50 (standard), else $5.99 — Express $9.99,
Next-day $16.99; 8% tax on the post-discount subtotal; promo `NORTH10` = 10% off.

## Dioschub integration

### Integration surface

The **entire** DioscHub integration is the delta between this branch and
[`main`](../../tree/main) — verify with `git diff main..production --stat`:

| What | Files |
| --- | --- |
| Kit embed | `components/assistant/AssistantProvider.tsx` + its mount/config in `app/layout.tsx` |
| BYOA bind route | `app/api/diosc/bind/route.ts` |
| MCP connector | `mcp/` (own package + Dockerfile) |
| SDK (vendored until npm) | `vendor/dioschub-client/` + the `file:` dep in `package.json` |
| Config | `DIOSC_*` entries in `.env.example`; SDK build stage in `Dockerfile` |
| Hub-side prompt | `ASSISTANT-PROMPT.md` |

Nothing else in the app changes. That is the point of the sample.

The assistant is embedded in the root layout via
`components/assistant/AssistantProvider.tsx`, mirroring the acme-helpdesk
integration, adapted for Next.js:

- Loads the kit with `@intrigsoft/dioschub-client` and renders `<diosc-chat>`.
- Configures `bindEndpoint: '/api/diosc/bind'` — a **same-origin** route handler.
  Cookies flow to it automatically, so no explicit bind headers are needed.
- Connects in **anonymous-capable** mode and, on sign-in, promotes the session in
  place (`reauth`) — the same anon→auth flow the storefront itself uses.
- Registers a client-side `navigate` tool and streams route changes as page
  context.

### BYOA / credential-blind

`/api/diosc/bind` forwards the visitor's **identity** (or `null` for a guest) plus
a **BYOA auth artifact** — here, the visitor's own `nw_sid` session cookie — to the
hub, authenticated with the host's `DIOSC_HUB_API_KEY`. A Northwind MCP connector
can replay that cookie against this storefront's `/api/*` routes to act *as the
visitor*, under their existing permissions. The assistant never sees credentials,
and the hub API key never reaches the browser.

### MCP connector

A **Northwind MCP server** lives in [`mcp/`](./mcp/README.md). It exposes the
shopping journey as assistant tools (`search_products`, `add_to_cart`,
`place_order`, …) — a thin, session-authorized layer over the `/api/*` routes
above. Each tool replays the visitor's forwarded `nw_sid` cookie, so the
assistant acts *as the visitor*; `place_order` is flagged destructive for the
hub's approval workflow. Run it alongside the storefront:

```bash
cd mcp && npm install && cp .env.example .env && npm run dev   # Streamable HTTP on :3011
```

Register `http://localhost:3011/mcp` as an MCP connector in the Dioschub admin
portal. See [`mcp/README.md`](./mcp/README.md).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3010 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | `tsc --noEmit` |

## Notes & limitations (it's a demo)

- The in-memory store resets on every server restart — intentional; no database.
- Demo auth accepts any credentials; cards/payment are display-only (no PANs are
  ever stored or processed).
- Product imagery is proxied from a public stock-photo CDN; a real deployment
  would serve its own assets through the same `/api/images` route.
