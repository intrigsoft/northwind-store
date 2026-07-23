import { categories, products } from '@/server/catalog';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/categories — categories with a live product count. */
export async function GET() {
  const withCounts = categories.map((c) => ({
    ...c,
    count: products.filter((p) => p.category === c.slug).length,
  }));
  return json({ categories: withCounts });
}
