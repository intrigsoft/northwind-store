# Northwind MCP connector — self-contained (no monorepo deps).
# BUILD CONTEXT = this folder (samples/northwind/mcp). On Railway, set this
# service's Root Directory to `samples/northwind/mcp`; no repo-root context and
# the repo-root .dockerignore does not apply.

# ── Stage 1: compile TS → dist ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: runtime (prod deps only) ────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3011
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && groupadd -r nodejs && useradd -r -g nodejs mcp
COPY --from=builder /app/dist ./dist
USER mcp
# app.listen(PORT) binds dual-stack (::), so the hub can reach it over Railway's
# IPv6 private network at northwind-mcp.railway.internal:$PORT.
EXPOSE 3011
CMD ["node", "dist/server.js"]
