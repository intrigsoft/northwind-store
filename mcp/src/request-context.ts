/**
 * Request context for MCP tool calls (BYOA plumbing).
 *
 * When Dioschub invokes an MCP tool on behalf of a visitor, it forwards that
 * visitor's auth artifacts in the tool call's `_meta` property. For Northwind
 * the artifact is the storefront **session cookie** (`nw_sid`), captured at bind
 * time by `/api/diosc/bind`. We extract it here and replay it against the
 * storefront API so every tool acts *as the visitor* — credential-blind: the
 * model never sees the cookie, it just rides along in `_meta`.
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

/**
 * Extract headers/cookies from the tool call's HTTP request headers. DioscHub
 * sends the visitor's auth (the `nw_sid` session cookie) as the request's HTTP
 * headers (MCP spec 2025-11-25), not in `_meta`. Header names are lowercased.
 */
export function extractRequestContextFromHeaders(
  httpHeaders: Record<string, string | string[] | undefined> | undefined,
): RequestContext {
  const context: RequestContext = { headers: {}, cookies: {} };
  if (!httpHeaders) return context;
  for (const [key, value] of Object.entries(httpHeaders)) {
    if (typeof value === 'string') context.headers[key.toLowerCase()] = value;
    else if (Array.isArray(value) && value.length > 0) context.headers[key.toLowerCase()] = value.join(', ');
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
