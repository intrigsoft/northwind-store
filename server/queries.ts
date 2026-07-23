/**
 * Catalog query helpers — search, filter, sort, related.
 *
 * Mirrors the filtering the prototype did on the client (`listing.jsx`), but
 * runs on the server so the client only ever receives the matching DTOs.
 */
import { products, getProduct } from './catalog';
import type { Product } from './types';

export type SortKey = 'featured' | 'low' | 'high' | 'rating' | 'reviews';

/** Common words dropped from free-text search so NL queries match by keyword. */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'under', 'over', 'with', 'your', 'you', 'are', 'any',
  'that', 'this', 'from', 'have', 'show', 'find', 'looking', 'need', 'want',
  'some', 'all', 'get', 'can', 'please', 'about', 'around', 'than', 'less',
]);

export interface ProductQuery {
  q?: string;
  /** One or more category slugs. 'all' (or empty) means no category filter. */
  category?: string[];
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onSale?: boolean;
  sort?: SortKey;
}

export function listBrands(): string[] {
  return [...new Set(products.map((p) => p.brand))].sort();
}

export function searchProducts(query: ProductQuery): Product[] {
  let items = products.slice();

  if (query.q) {
    // Token-based match (not full-string substring), so natural-language queries
    // like "wireless earbuds or headphones" work — important for assistant use.
    // A product matches if its searchable text contains ANY significant token.
    const tokens = query.q
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    if (tokens.length) {
      items = items.filter((p) => {
        const hay = `${p.title} ${p.brand} ${p.category} ${p.description}`.toLowerCase();
        return tokens.some((t) => {
          if (hay.includes(t)) return true;
          // Light plural→singular fallback so "speakers" matches "speaker".
          if (t.length > 3 && t.endsWith('s') && hay.includes(t.slice(0, -1))) return true;
          return false;
        });
      });
    }
  }
  const cats = (query.category ?? []).filter((c) => c && c !== 'all');
  if (cats.length) {
    items = items.filter((p) => cats.includes(p.category));
  }
  if (query.brand && query.brand.length) {
    items = items.filter((p) => query.brand!.includes(p.brand));
  }
  if (typeof query.minPrice === 'number') {
    items = items.filter((p) => p.price >= query.minPrice!);
  }
  if (typeof query.maxPrice === 'number') {
    items = items.filter((p) => p.price <= query.maxPrice!);
  }
  if (query.minRating) {
    items = items.filter((p) => p.rating >= query.minRating!);
  }
  if (query.onSale) {
    items = items.filter((p) => p.compareAt);
  }

  const sort = query.sort ?? 'featured';
  items.sort((a, b) => {
    if (sort === 'low') return a.price - b.price;
    if (sort === 'high') return b.price - a.price;
    if (sort === 'rating') return b.rating - a.rating;
    if (sort === 'reviews') return b.reviews - a.reviews;
    const weight = (p: Product) =>
      (p.badges.includes('best') ? 2 : 0) + (p.badges.includes('new') ? 1 : 0);
    return weight(b) - weight(a);
  });

  return items;
}

export function relatedProducts(id: string, limit = 6): Product[] {
  const p = getProduct(id);
  if (!p) return [];
  return products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, limit);
}
