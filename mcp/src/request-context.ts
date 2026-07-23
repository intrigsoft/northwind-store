/**
 * Request context for MCP tool calls.
 *
 * The visitor's session headers come out of the auth broker (see
 * auth-broker.ts): the hub presents the JWT this server issued at bind time,
 * and the broker exchanges it for the cached storefront cookie. This module
 * just shapes those headers for replay against the storefront API — the model
 * never sees the cookie, and the JWT never leaves this server.
 */

export interface RequestContext {
  headers: Record<string, string>;
  cookies: Record<string, string>;
  userId?: string;
  sessionId?: string;
}

/** Extract headers/cookies/identity from a tool call's `_meta`. */
export function extractRequestContext(meta: Record<string, any> | undefined): RequestContext {
  const context: RequestContext = { headers: {}, cookies: {} };
  if (!meta) return context;

  context.userId = meta.userId;
  context.sessionId = meta.sessionId;

  if (meta.headers && typeof meta.headers === 'object') {
    for (const [key, value] of Object.entries(meta.headers)) {
      if (typeof value === 'string') context.headers[key] = value;
    }
  }
  if (meta.cookies && typeof meta.cookies === 'object') {
    for (const [key, value] of Object.entries(meta.cookies)) {
      if (typeof value === 'string') context.cookies[key] = value;
    }
  }
  return context;
}

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

/** Headers to forward to the storefront, minus hop-by-hop ones. */
export function getForwardHeaders(context: RequestContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(context.headers)) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out[key] = value;
  }
  return out;
}

/**
 * Build the `Cookie` header to forward. Combines any explicit `cookies` map with
 * a `cookie`/`Cookie` header that may already be present in `headers`.
 */
export function getCookieHeader(context: RequestContext): string | undefined {
  const parts: string[] = [];
  const headerCookie = context.headers['cookie'] || context.headers['Cookie'];
  if (headerCookie) parts.push(headerCookie);
  for (const [key, value] of Object.entries(context.cookies)) parts.push(`${key}=${value}`);
  return parts.length ? parts.join('; ') : undefined;
}
