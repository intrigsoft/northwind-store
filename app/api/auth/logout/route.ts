import { getSession } from '@/server/session';
import { logout } from '@/server/store';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — returns to a fresh guest on the same session. */
export async function POST() {
  const session = await getSession();
  logout(session);
  return json({ user: null });
}
