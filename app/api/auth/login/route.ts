import { getSession } from '@/server/session';
import { login } from '@/server/store';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login  { email, password }
 * Demo auth: any credentials succeed and sign you in as the returning user.
 * The session's guest cart/wishlist carry over (anon → auth in place).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const session = await getSession();
  const user = login(session, body.email ?? '');
  return json({ user });
}
