import { getSession } from '@/server/session';
import { wishlistProducts } from '@/server/store';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/wishlist — saved product ids + full products. Logged-in only. */
export async function GET() {
  const session = await getSession();
  if (!session.user) return fail('Sign in required', 401);
  return json({ productIds: session.wishlist, products: wishlistProducts(session) });
}
