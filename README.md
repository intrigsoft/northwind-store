# Northwind — Next.js Marketplace Storefront (DioscHub tutorial)

> **You are on `main` — the tutorial starting point.** This branch is a complete,
> working storefront with **no AI integration**. The DioscHub tutorial walks you
> from here to an embedded, tool-using assistant.
>
> - **Finished result**: the [`production`](../../tree/production) branch
>   (full DioscHub integration — the assistant, BYOA bind, and MCP connector).
> - **Live demo**: <https://northwind-staging.up.railway.app>
> - **Tutorial**: DioscHub docs → *Embed an assistant in Next.js* (link TBD).
> - Bulk copy-paste files for the tutorial steps live in [`tutorial/`](./tutorial/).

Northwind is a responsive, multi-page eCommerce storefront built as a **demo host
application for DioscHub**. It is a single **Next.js 15 (App Router) full-stack
app**: the same project serves the UI *and* the REST backend (via route handlers).

It implements the full shopping journey — browse → product → cart → checkout →
orders — on a real **anonymous → authenticated** session model. That session
model is the surface the tutorial's assistant plugs into: browse as a guest,
sign in mid-session, and (once integrated) the assistant operates *as the
logged-in user* under their permissions.

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
- Plain CSS design system (no Tailwind/preprocessor) — `app/globals.css`

## Getting started

```bash
npm install
npm run dev                     # http://localhost:3010
```

That's it — the bare storefront needs no configuration and no external services.

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
tutorial/                   ← copy-paste material for the DioscHub tutorial
                              (not part of the app build)
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

## What the tutorial adds

Starting from this branch, the DioscHub tutorial builds (in order):

1. **Embed the assistant kit** — a provider component in the root layout that
   loads the kit and renders `<diosc-chat>`.
2. **The bind route** (`app/api/diosc/bind`) — BYOA: forwards the visitor's
   identity + session cookie to the hub, authenticated with a server-side admin
   key that never reaches the browser.
3. **An MCP server** (`mcp/`) — exposes the shopping journey as assistant tools
   (`search_products`, `add_to_cart`, `place_order`, …) by replaying the
   visitor's own session cookie against the `/api/*` routes above.
4. **Hub configuration** — roles, tool grants, and approval gating for the
   destructive `place_order` tool.

The finished version of all of it is on the
[`production`](../../tree/production) branch; the bulk files you'll copy along
the way are in [`tutorial/`](./tutorial/).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3010 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | `tsc --noEmit` |

## License

MIT © IntrigSoft
