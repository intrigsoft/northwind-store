/**
 * Auth broker — the MCP server as OAuth-style token issuer (MCP spec 2025-11-25).
 *
 * The spec requires a resource server to accept only tokens issued for itself
 * (audience-bound) and forbids passing a client-presented token through to
 * upstream APIs. This module is how the Northwind MCP server satisfies both:
 *
 *   1. At bind time the storefront POSTs the visitor's identity + auth headers
 *      (the `nw_sid` session cookie) to `/auth/bind` here. The headers are
 *      CACHED server-side and never leave this process.
 *   2. We mint a short-lived HS256 JWT — issuer AND audience are this MCP
 *      server, `jti` keys the cache entry — and register it with the hub as
 *      the session's auth artifact. The hub stays credential-blind: it holds
 *      a token that references the credentials, never the credentials.
 *   3. On every tool call the hub presents `Authorization: Bearer <jwt>`. We
 *      validate it (signature, audience, expiry — trivial: we issued it),
 *      resolve the cached headers, and replay THOSE against the storefront.
 *
 * The cache is in-memory (single-replica sample). Production variants: a shared
 * store (Redis) keyed by `jti`, or encrypting the headers into the token itself.
 */
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'northwind-mcp';
const AUDIENCE = 'northwind-mcp';
const TTL_MS = 8 * 60 * 60 * 1000; // 8h — a shopping session

const RAW_SECRET = process.env.MCP_JWT_SECRET || '';
if (!RAW_SECRET) {
  console.warn('[auth-broker] MCP_JWT_SECRET not set — using an insecure dev fallback');
}
const SECRET = new TextEncoder().encode(RAW_SECRET || 'dev-insecure-northwind-mcp-jwt-secret');

interface CacheEntry {
  headers: Record<string, string>;
  expiresAt: number;
}

const sessions = new Map<string, CacheEntry>();

function sweep(): void {
  const now = Date.now();
  for (const [jti, entry] of sessions) {
    if (entry.expiresAt <= now) sessions.delete(jti);
  }
}
setInterval(sweep, 60_000).unref();

/** Cache the visitor's auth headers and mint the JWT that references them. */
export async function mintSessionToken(
  subject: string,
  headers: Record<string, string>,
): Promise<string> {
  const jti = crypto.randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  sessions.set(jti, { headers, expiresAt });

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(subject)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(SECRET);
}

/**
 * Validate a bearer JWT and resolve the cached auth headers it references.
 * Returns null for anything invalid: bad signature, wrong audience, expired,
 * or an unknown/evicted session (e.g. after a server restart).
 */
export async function resolveSessionHeaders(
  authorizationHeader: string | undefined,
): Promise<Record<string, string> | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice(7).trim();
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: ISSUER, audience: AUDIENCE });
    const entry = payload.jti ? sessions.get(payload.jti) : undefined;
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.headers;
  } catch {
    return null;
  }
}

/** Introspection for /health — never exposes header values. */
export function sessionCount(): number {
  sweep();
  return sessions.size;
}
