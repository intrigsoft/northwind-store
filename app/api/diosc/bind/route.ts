import { cookies } from 'next/headers';
import { getSession } from '@/server/session';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

const HUB_URL = process.env.DIOSC_HUB_BACKEND_URL || 'http://localhost:3333';
const HUB_API_KEY = process.env.DIOSC_HUB_API_KEY || '';
const ROLE_ID = process.env.DIOSC_HUB_ROLE_ID || 'role-default';

/**
 * POST /api/diosc/bind  { wsId }
 *
 * Host-side bind endpoint for the assistant kit (its `bindEndpoint`). Called
 * whenever Dioschub emits `widget:auth:required`. Auth is OPTIONAL:
 *   - a signed-in visitor binds with full identity + a BYOA auth artifact,
 *   - a guest binds with identity:null, so Dioschub records an anonymous session.
 * On later sign-in the kit re-binds the same connection (`reauth`) and Dioschub
 * promotes the anonymous session in place.
 *
 * BYOA / credential-blind: the artifact we forward is the visitor's own
 * `nw_sid` session cookie. A Northwind MCP connector can replay it against this
 * storefront's /api routes to act *as the visitor* under their existing
 * permissions — the assistant never sees credentials, and HUB_API_KEY (the
 * host's deploy-time secret) never reaches the browser.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { wsId?: string };
  if (!body.wsId) return fail('wsId is required', 400);
  if (!HUB_API_KEY) {
    console.warn('[diosc/bind] DIOSC_HUB_API_KEY not set — the hub will reject this bind');
  }

  const session = await getSession();
  const jar = await cookies();
  const sid = jar.get('nw_sid')?.value;
  const user = session.user;

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
    authArtifacts: {
      // Replayable session handle — lets the connector call /api/* on the SAME
      // session. Forwarded for guests too (identity stays null above), so the
      // assistant can manage the visitor's anonymous cart/wishlist; once signed
      // in, the same cookie now resolves to the authenticated user.
      headers: sid ? { cookie: `nw_sid=${sid}` } : {},
    },
  };

  try {
    const res = await fetch(`${HUB_URL}/api/auth/bind`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': HUB_API_KEY },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[diosc/bind] hub /api/auth/bind failed (${res.status}): ${text}`);
      return fail(`dioschub bind failed: ${res.status}`, 502);
    }
  } catch (err) {
    console.error('[diosc/bind] could not reach the hub:', err);
    return fail('could not reach dioschub', 502);
  }

  return json({ ok: true });
}
