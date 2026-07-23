import { getProduct } from '@/server/catalog';
import { relatedProducts } from '@/server/queries';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/products/:id/related — products in the same category. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProduct(id)) return fail('Product not found', 404);
  return json({ products: relatedProducts(id) });
}
