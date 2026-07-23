'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Stars } from '@/components/Stars';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import type { Product, SortKey } from '@/lib/types';

const PRICE_MAX = 1200;

/**
 * Shared listing view for both category browse (`/c/:slug`) and search
 * (`/search?q=`). All filtering/sorting is delegated to the API — this
 * component just collects filter state and renders the matching products.
 */
export function ListingView({ category, query }: { category?: string; query?: string }) {
  const s = useStore();
  const baseCatSlug = category && category !== 'all' ? category : null;
  const baseCat = baseCatSlug ? s.categories.find((c) => c.slug === baseCatSlug) : null;
  const isSearch = query !== undefined;

  const [cats, setCats] = useState<string[]>(baseCatSlug ? [baseCatSlug] : []);
  const [brands, setBrands] = useState<string[]>([]);
  const [price, setPrice] = useState(PRICE_MAX);
  const [minRating, setMinRating] = useState(0);
  const [onSale, setOnSale] = useState(false);
  const [sort, setSort] = useState<SortKey>('featured');
  const [mobOpen, setMobOpen] = useState(false);

  const [items, setItems] = useState<Product[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset filters whenever the route target (category/query) changes.
  useEffect(() => {
    setCats(baseCatSlug ? [baseCatSlug] : []);
    setBrands([]); setPrice(PRICE_MAX); setMinRating(0); setOnSale(false); setSort('featured');
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query]);

  // Fetch matching products whenever a filter changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getProducts({
        q: query || undefined,
        category: cats.length ? cats : baseCatSlug ? [baseCatSlug] : undefined,
        brand: brands.length ? brands : undefined,
        maxPrice: price < PRICE_MAX ? price : undefined,
        minRating: minRating || undefined,
        onSale: onSale || undefined,
        sort,
      })
      .then((r) => {
        if (!alive) return;
        setItems(r.products);
        setAllBrands(r.brands);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, cats, brands, price, minRating, onSale, sort, baseCatSlug]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const clearAll = () => {
    setCats(baseCatSlug ? [baseCatSlug] : []);
    setBrands([]); setPrice(PRICE_MAX); setMinRating(0); setOnSale(false);
  };

  const activeChips = useMemo(
    () => [
      ...brands.map((b) => ({ label: b, clear: () => setBrands(brands.filter((x) => x !== b)) })),
      ...(price < PRICE_MAX ? [{ label: `Under ${money(price)}`, clear: () => setPrice(PRICE_MAX) }] : []),
      ...(minRating ? [{ label: `${minRating}★ & up`, clear: () => setMinRating(0) }] : []),
      ...(onSale ? [{ label: 'On sale', clear: () => setOnSale(false) }] : []),
    ],
    [brands, price, minRating, onSale],
  );

  const title = isSearch ? `Results for "${query}"` : baseCat ? baseCat.name : 'All products';
  const sub = baseCat ? baseCat.name + ' — curated picks and new arrivals' : null;

  const FilterPanel = () => (
    <>
      {!baseCat && (
        <div className="filter-group">
          <h4>Category</h4>
          {s.categories.map((c) => (
            <label className="fcheck" key={c.slug}>
              <input type="checkbox" checked={cats.includes(c.slug)} onChange={() => toggle(cats, setCats, c.slug)} />
              {c.name}{c.count != null && <span className="ct">{c.count}</span>}
            </label>
          ))}
        </div>
      )}
      <div className="filter-group">
        <h4>Brand</h4>
        {allBrands.map((b) => (
          <label className="fcheck" key={b}>
            <input type="checkbox" checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, b)} />{b}
          </label>
        ))}
      </div>
      <div className="filter-group">
        <h4>Max price</h4>
        <input type="range" min={20} max={PRICE_MAX} step={10} value={price} onChange={(e) => setPrice(+e.target.value)} style={{ width: '100%', accentColor: 'var(--ink)' }} />
        <div className="flex between" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          <span>$20</span><span className="price" style={{ color: 'var(--ink)' }}>{price >= PRICE_MAX ? '$1200+' : money(price)}</span>
        </div>
      </div>
      <div className="filter-group">
        <h4>Rating</h4>
        {[4, 4.5].map((rt) => (
          <label className="fcheck" key={rt}>
            <input type="radio" name="rating" checked={minRating === rt} onChange={() => setMinRating(rt)} style={{ accentColor: 'var(--ink)' }} />
            <Stars value={rt} /> &amp; up
          </label>
        ))}
        <label className="fcheck">
          <input type="radio" name="rating" checked={minRating === 0} onChange={() => setMinRating(0)} style={{ accentColor: 'var(--ink)' }} />Any rating
        </label>
      </div>
      <div className="filter-group">
        <h4>Offers</h4>
        <label className="fcheck"><input type="checkbox" checked={onSale} onChange={() => setOnSale(!onSale)} />On sale only</label>
      </div>
    </>
  );

  return (
    <main className="wrap section" style={{ paddingTop: 22 }}>
      <div className="breadcrumb">
        <a href="/" onClick={(e) => { e.preventDefault(); s.navigate('/'); }}>Home</a>
        <span className="sep">/</span>
        {baseCat ? <span>{baseCat.name}</span> : <span>{isSearch ? 'Search' : 'All products'}</span>}
      </div>
      <div className="page-head" style={{ padding: '0 0 22px' }}>
        <h1 style={{ fontSize: 32 }}>{title}</h1>
        {sub && <p className="text-muted" style={{ margin: '6px 0 0' }}>{sub}</p>}
      </div>

      <div className="listing">
        <aside className="filters">
          <div className="flex between center" style={{ marginBottom: 6 }}>
            <strong style={{ fontSize: 15 }}>Filters</strong>
            <button className="link-btn" onClick={clearAll}>Clear all</button>
          </div>
          <FilterPanel />
        </aside>

        <div>
          <div className="list-toolbar">
            <span className="list-count"><b>{items.length}</b> {items.length === 1 ? 'product' : 'products'}</span>
            <div className="flex center gap-12">
              <button className="chip mobile-filter-toggle" onClick={() => setMobOpen(true)}>
                <Icon name="sliders" size={16} /> Filters{activeChips.length ? ` (${activeChips.length})` : ''}
              </button>
              <label className="flex center gap-8" style={{ fontSize: 13.5 }}>
                <span className="text-muted">Sort</span>
                <select className="select" style={{ width: 'auto', height: 40 }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="featured">Featured</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                  <option value="rating">Top rated</option>
                  <option value="reviews">Most reviewed</option>
                </select>
              </label>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="active-filters">
              {activeChips.map((c, i) => (
                <span className="afilter" key={i}>{c.label}<button onClick={c.clear} aria-label="Remove"><Icon name="x" size={13} /></button></span>
              ))}
              <button className="link-btn" style={{ alignSelf: 'center' }} onClick={clearAll}>Clear all</button>
            </div>
          )}

          {loading ? (
            <p className="text-muted" style={{ padding: '24px 0' }}>Loading…</p>
          ) : items.length === 0 ? (
            <div className="empty">
              <div className="empty-ic"><Icon name="search" size={28} /></div>
              <h3>No products found</h3>
              <p>Try removing a filter or searching for something else.</p>
              <button className="btn btn-outline" onClick={clearAll}>Clear filters</button>
            </div>
          ) : (
            <div className="pgrid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </div>
      </div>

      {mobOpen && (
        <>
          <div className="drawer-scrim" onClick={() => setMobOpen(false)} />
          <div className="drawer" style={{ left: 0, right: 'auto', animationName: 'slideInL' }}>
            <div className="drawer-head"><h3>Filters</h3><button className="icon-btn" onClick={() => setMobOpen(false)}><Icon name="x" /></button></div>
            <div className="drawer-body"><FilterPanel /></div>
            <div className="drawer-foot flex gap-12">
              <button className="btn btn-outline grow" onClick={clearAll}>Clear all</button>
              <button className="btn btn-primary grow" onClick={() => setMobOpen(false)}>Show {items.length}</button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
