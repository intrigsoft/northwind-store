# Northwind storefront (Next.js) — bare host app (tutorial starting point).
# The `production` branch's Dockerfile additionally builds the DioscHub client
# SDK; this one is just the Next app.

# ── Stage 1: build the Next app ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /repo
COPY . .
RUN npm install --no-audit --no-fund
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

COPY --from=builder --chown=nextjs:nodejs /repo/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/public ./public

USER nextjs
EXPOSE 3010
CMD ["node", "server.js"]
