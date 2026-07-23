/**
 * Session cookie plumbing.
 *
 * Every visitor gets an opaque, httpOnly session cookie on first contact. The
 * cookie carries no identity — it just keys the in-memory session (cart,
 * wishlist, auth state) server-side. This shape is what later lets an
 * assistant bind to the same visitor (see the DioscHub tutorial): the
 * storefront owns the session end-to-end.
 */
import { cookies } from 'next/headers';
import { getOrCreateSession, hasSession, newSessionId, type Session } from './store';

const SID_COOKIE = 'nw_sid';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Resolve the current session, minting a new cookie if needed.
 *
 * Safe to call from any route handler — `cookies()` is writable there. In a
 * Server Component context (read-only cookies) it still resolves an existing
 * session but cannot mint one; route handlers are the place that creates them.
 */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  let sid = jar.get(SID_COOKIE)?.value;
  if (!sid || !hasSession(sid)) {
    sid = sid && !hasSession(sid) ? sid : newSessionId();
    try {
      jar.set(SID_COOKIE, sid, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: THIRTY_DAYS,
      });
    } catch {
      // Read-only cookie context (e.g. a Server Component) — fall through with
      // an ephemeral session that won't persist a cookie. Route handlers, which
      // do all mutations, always run in a writable context.
    }
  }
  return getOrCreateSession(sid);
}
