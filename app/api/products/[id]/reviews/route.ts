import { getProduct, getReviews, ratingDistribution } from '@/server/catalog';
import { json, fail } from '@/server/http';
import type { ReviewSummary } from '@/server/types';

export const dynamic = 'force-dynamic';

/** GET /api/products/:id/reviews — rating summary + review list. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return fail('Product not found', 404);

  const summary: ReviewSummary = {
    rating: product.rating,
    total: product.reviews,
    distribution: ratingDistribution,
    reviews: getReviews(),
  };
  return json(summary);
}
