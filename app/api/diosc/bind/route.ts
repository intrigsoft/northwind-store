import { cookies } from 'next/headers';
import { getSession } from '@/server/session';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

const MCP_URL = (process.env.NORTHWIND_MCP_URL || 'http://localhost:3011').replace(/\/$/, '');
const MCP_BIND_SECRET = process.env.MCP_BIND_SECRET || '';
const ROLE_ID = process.env.DIOSC_HUB_ROLE_ID || 'role-default';

/**
 * POST /api/diosc/bind  { wsId }
 *
 * Host-side bind endpoint for the assistant kit (its `bindEndpoint`). Called
 * whenever Dioschub emits `widget:auth:required`. Auth is OPTIONAL:
 *   - a signed-in visitor binds with full identity,
 *   - a guest binds with identity:null, so Dioschub records an anonymous session.
 * On later sign-in the kit re-binds the same connection (`reauth`) and Dioschub
 * promotes the anonymous session in place.
 *
 * OAuth-style broker flow (MCP spec 2025-11-25): we do NOT talk to the hub, and
 * the visitor's session cookie never reaches it. We hand identity + the cookie
 * to OUR MCP server's /auth/bind; the MCP server caches the cookie, mints an
 * audience-bound JWT referencing it, and registers that JWT with the hub as the
 * session's auth artifact. On each tool call the MCP server validates the JWT
 * and exchanges it for the cached cookie — credential-blind end to end.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { wsId?: string };
  if (!body.wsId) return fail('wsId is required', 400);

  const session = await getSession();
  const jar = await cookies();
  const sid = jar.get('nw_sid')?.value;
  const user = session.user;
  if (!sid) return fail('no visitor session to bind', 400);

  const payload = {
    wsId: body.wsId,
    identity: user
      ? {
          userId: user.id,
          username: user.name || user.email,
          // Authenticated visitors resolve to the "shopper" role (account
          // features + approval-gated checkout). Guests bind identity:null
          // above, so the hub keeps them on the "anonymous" role; signing in
          // re-binds the same connection and promotes anonymous → shopper.
          role: { id: ROLE_ID, name: 'shopper' },
        }
      : null,
    // The visitor's auth artifact — replayable session handle for the MCP
    // server's cache. Forwarded for guests too, so the assistant can manage an
    // anonymous cart; after sign-in the same cookie resolves to the user.
    headers: { cookie: `nw_sid=${sid}` },
  };

  try {
    const res = await fetch(`${MCP_URL}/auth/bind`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(MCP_BIND_SECRET ? { 'x-bind-secret': MCP_BIND_SECRET } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[diosc/bind] mcp /auth/bind failed (${res.status}): ${text}`);
      return fail(`assistant bind failed: ${res.status}`, 502);
    }
  } catch (err) {
    console.error('[diosc/bind] could not reach the MCP server:', err);
    return fail('could not reach the assistant broker', 502);
  }

  return json({ ok: true });
}
