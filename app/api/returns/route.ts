import { getSession } from '@/server/session';
import { listReturns, startReturn } from '@/server/store';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/returns — return/refund requests raised in this session. */
export async function GET() {
  const session = await getSession();
  return json({ returns: listReturns(session) });
}

/** POST /api/returns — start a return against a delivered order. */
export async function POST(req: Request) {
  const session = await getSession();
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; reason?: string };
  if (!body.orderId) return fail('orderId is required', 400);

  const result = startReturn(session, body.orderId, body.reason ?? '');
  if (!result.ok) return fail(result.reason, result.status);
  return json({ return: result.ret });
}
