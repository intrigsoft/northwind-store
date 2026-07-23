import type { NextRequest } from 'next/server';
import { searchProducts, listBrands, type SortKey } from '@/server/queries';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

const SORTS: SortKey[] = ['featured', 'low', 'high', 'rating', 'reviews'];

/**
 * GET /api/products
 * Query: q, category, brand (repeatable), minPrice, maxPrice, minRating,
 *        onSale, sort, page, limit
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const sortParam = sp.get('sort') as SortKey | null;
  const all = searchProducts({
    q: sp.get('q') ?? undefined,
    category: sp.getAll('category'),
    brand: sp.getAll('brand'),
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    minRating: num('minRating'),
    onSale: sp.get('onSale') === 'true',
    sort: sortParam && SORTS.includes(sortParam) ? sortParam : 'featured',
  });

  const page = Math.max(1, num('page') ?? 1);
  const limit = Math.min(100, Math.max(1, num('limit') ?? all.length));
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return json({
    products: items,
    total: all.length,
    page,
    limit,
    brands: listBrands(),
  });
}
