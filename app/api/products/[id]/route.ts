import { getProduct, getCategory } from '@/server/catalog';
import { json, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/products/:id — full product detail + its category. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return fail('Product not found', 404);
  return json({ product, category: getCategory(product.category) ?? null });
}
