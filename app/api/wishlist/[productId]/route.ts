import { getSession } from '@/server/session';
import { addWishlist, removeWishlist, wishlistProducts } from '@/server/store';
import { getProduct } from '@/server/catalog';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

function view(session: Awaited<ReturnType<typeof getSession>>) {
  return { productIds: session.wishlist, products: wishlistProducts(session) };
}

/** POST /api/wishlist/:productId — add a saved item. Logged-in only. */
export async function POST(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.user) return fail('Sign in required', 401);
  if (!getProduct(productId)) return fail('Unknown product', 404);
  addWishlist(session, productId);
  return json(view(session));
}

/** DELETE /api/wishlist/:productId — remove a saved item. Logged-in only. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.user) return fail('Sign in required', 401);
  removeWishlist(session, productId);
  return json(view(session));
}
