import { getSession } from '@/server/session';
import { signup } from '@/server/store';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signup  { name, email, password }
 * Creates a fresh account (no history, empty address book) and signs in.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string };
  const session = await getSession();
  const user = signup(session, body.name ?? '', body.email ?? '');
  return json({ user });
}
