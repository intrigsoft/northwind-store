# Northwind storefront (Next.js) — Dioschub demo host.
#
# BUILD CONTEXT = REPO ROOT. The storefront depends on the client SDK vendored
# at `vendor/dioschub-client` (a `file:` dep), whose `dist/` is gitignored and
# built here. The MCP connector (`mcp/`) is a separate service with its own
# Dockerfile — it is excluded from this build via `Dockerfile.dockerignore`.

# ── Stage 1: build the client SDK, then the Next app ─────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /repo

# 1a. Build @intrigsoft/dioschub-client (tiny tsc lib → dist/).
COPY vendor/dioschub-client ./vendor/dioschub-client
RUN cd vendor/dioschub-client \
    && npm install --no-audit --no-fund --no-save typescript@5.7.2 tslib \
    && npx tsc -p tsconfig.lib.json

# 1b. Install + build the storefront. `--install-links` materialises the
#     file: client dep as a real copy inside node_modules (not a symlink) so
#     Next's standalone tracing bundles it.
#     `npm install` (not `ci`): the committed sample lockfile pins an older
#     client version (file: dep, bumped without re-locking), which `ci` rejects.
COPY . .
RUN npm install --no-audit --no-fund --install-links
# The assistant's public config is read at runtime (server layout reads
# DIOSC_PUBLIC_BACKEND_URL / DIOSC_EMBED_API_KEY / DIOSC_PUBLIC_ASSISTANT_ID),
# so no build-time NEXT_PUBLIC_* args are needed — one image, configured per deploy.
RUN npm run build
# The storefront ships no static public/ assets today (imagery proxies through
# /api/images); ensure the dir exists so the runtime COPY is robust either way.
RUN mkdir -p public

# ── Stage 2: minimal runtime (Next standalone output) ────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3010 \
    HOSTNAME="::"

# Non-root for safety.
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

# outputFileTracingRoot is the repo root, so the standalone tree is rooted
# there: server.js + node_modules at the top, static/public placed beside it.
COPY --from=builder --chown=nextjs:nodejs /repo/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/public ./public

USER nextjs
EXPOSE 3010
CMD ["node", "server.js"]
