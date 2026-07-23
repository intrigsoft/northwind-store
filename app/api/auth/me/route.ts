import { getSession } from '@/server/session';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — the signed-in user, or { user: null } for a guest. */
export async function GET() {
  const session = await getSession();
  return json({ user: session.user });
}
