'use client';

import { use, useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Stars } from '@/components/Stars';
import { ProductImage } from '@/components/ProductImage';
import { ProductCard, Badges } from '@/components/ProductCard';
import { SectionHead } from '@/components/SectionHead';
import { api } from '@/lib/api-client';
import { money, pctOff, kfmt } from '@/lib/format';
import type { Category, Product, ReviewSummary } from '@/lib/types';

const ASSURANCES: [string, string, string][] = [
  ['truck', 'Free delivery', 'Arrives in 1–3 days'],
  ['refresh', '30-day returns', 'Free & easy'],
  ['shield', '2-year warranty', 'Covered by Northwind'],
  ['lock', 'Secure checkout', 'Encrypted payment'],
];

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();

  const [p, setP] = useState<Product | null>(null);
  const [cat, setCat] = useState<Category | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'desc' | 'specs' | 'reviews'>('desc');

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImg(0); setQty(1); setTab('desc'); setSize(null); setNotFound(false);
    setP(null);
    api
      .getProduct(id)
      .then(({ product, category }) => {
        setP(product);
        setCat(category);
        setColor(product.colors ? product.colors[0][0] : null);
      })
      .catch(() => setNotFound(true));
    api.getReviews(id).then(setReviews).catch(() => setReviews(null));
    api.getRelated(id).then((r) => setRelated(r.products)).catch(() => setRelated([]));
  }, [id]);

  if (notFound) {
    return (
      <main className="wrap section">
        <div className="empty"><h3>Product not found</h3><button className="btn btn-primary" onClick={() => s.navigate('/c/all')}>Back to shop</button></div>
      </main>
    );
  }
  if (!p) {
    return <main className="wrap section"><p className="text-muted">Loading…</p></main>;
  }

  const wished = s.inWishlist(p.id);
  const optLabel = [color, size].filter(Boolean).join(' · ');
  const needSize = !!p.sizes && !size;

  const add = (buy: boolean) => {
    if (needSize) { s.toast('Please select a size first'); return; }
    void s.addToCart(p.id, { qty, opt: optLabel });
    if (buy) s.navigate('/checkout');
  };

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="breadcrumb" style={{ marginTop: 14 }}>
        <a href="/" onClick={(e) => { e.preventDefault(); s.navigate('/'); }}>Home</a><span className="sep">/</span>
        {cat && <><a href={`/c/${cat.slug}`} onClick={(e) => { e.preventDefault(); s.navigate(`/c/${cat.slug}`); }}>{cat.name}</a><span className="sep">/</span></>}
        <span>{p.title}</span>
      </div>

      <div className="pdp-wrap">
        <div className="pdp">
          <div className="gallery">
            <div className="gallery-main"><ProductImage src={p.images[activeImg]} tint={p.tint} alt={p.title} /></div>
            <div className="gallery-thumbs">
              {p.images.map((src, i) => (
                <div key={i} className={'gthumb' + (activeImg === i ? ' active' : '')} onClick={() => setActiveImg(i)}><ProductImage src={src} tint={p.tint} /></div>
              ))}
            </div>
          </div>

          <div className="pdp-info">
            <div className="flex center gap-8" style={{ flexWrap: 'wrap' }}>
              {p.mall && <span className="tag-mall" style={{ height: 18 }}>Official Store</span>}
              <span className="text-muted" style={{ fontSize: 13 }}>{p.brand}</span>
              <Badges list={p.badges} />
            </div>
            <h1 className="pdp-title">{p.title}</h1>
            <div className="pdp-meta">
              <span className="mi"><b>{p.rating}</b> <Stars value={p.rating} size={15} /></span><span className="div" />
              <span className="mi" style={{ color: 'var(--muted)' }}>{p.reviews.toLocaleString()} ratings</span><span className="div" />
              <span className="mi" style={{ color: 'var(--muted)' }}>{kfmt(p.sold)} sold</span><span className="div" />
              <span className="mi mono" style={{ color: 'var(--muted)', fontSize: 12 }}>SKU {p.sku}</span>
            </div>

            <div className="pdp-price-box">
              <span className="pdp-price">{money(p.price)}</span>
              {p.compareAt && <span className="pdp-was">{money(p.compareAt)}</span>}
              {p.compareAt && <span className="pdp-save">-{pctOff(p.price, p.compareAt)}%</span>}
              {p.freeShip && <span className="tag tag-ship" style={{ marginLeft: 'auto' }}><Icon name="truck" size={15} /> Free shipping</span>}
            </div>

            {p.colors && (
              <div className="opt-row">
                <div className="opt-label">{p.category === 'beauty' ? 'Variant' : 'Colour'}</div>
                <div className="swatches">
                  {p.colors.map(([name, hex]) => (
                    <button key={name} className={'swatch-btn' + (color === name ? ' on' : '')} onClick={() => setColor(name)}><span className="dot" style={{ background: hex }} />{name}</button>
                  ))}
                </div>
              </div>
            )}
            {p.sizes && (
              <div className="opt-row">
                <div className="opt-label">Size</div>
                <div className="sizes">
                  {p.sizes.map((sz, i) => {
                    const off = i === p.sizes!.length - 1 && p.sizes!.length > 5;
                    return <button key={sz} className={'size-btn' + (size === sz ? ' on' : '') + (off ? ' off' : '')} onClick={() => (off ? null : setSize(sz))}>{sz}</button>;
                  })}
                </div>
              </div>
            )}
            <div className="opt-row">
              <div className="opt-label">Quantity</div>
              <div className="flex center gap-16" style={{ flexWrap: 'wrap' }}>
                <div className="qty">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Icon name="minus" size={16} /></button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(qty + 1)} aria-label="Increase"><Icon name="plus" size={16} /></button>
                </div>
                <span className="stock-line"><span className="stock-dot" />{p.stock} in stock</span>
              </div>
            </div>

            <div className="buy-row">
              <button className="btn btn-outline btn-lg grow" onClick={() => add(false)}><Icon name="cart" size={18} /> Add to Cart</button>
              <button className="btn btn-accent btn-lg grow" onClick={() => add(true)}>Buy Now</button>
              <button className="btn btn-outline btn-lg" style={{ padding: '0 16px', color: wished ? 'var(--price)' : '', borderColor: wished ? 'var(--price)' : '' }} onClick={() => void s.toggleWish(p.id)} aria-label="Save"><Icon name="heart" size={19} fill={wished ? 'current' : 'none'} /></button>
            </div>

            <div className="pdp-assure">
              {ASSURANCES.map(([ic, t, d]) => (
                <div className="assure" key={t}><Icon name={ic} size={22} /><div><div style={{ fontWeight: 600 }}>{t}</div><div className="text-muted" style={{ fontSize: 12 }}>{d}</div></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="pdp-wrap" style={{ marginTop: 14 }} id="pdp-tabs">
        <div className="tabs">
          {([['desc', 'Description'], ['specs', 'Specifications'], ['reviews', `Reviews (${p.reviews.toLocaleString()})`]] as const).map(([k, l]) => (
            <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'desc' && (
          <div className="prose">
            <p>{p.description}</p>
            <p>Every {p.title.toLowerCase()} is quality-checked before it ships and backed by our two-year Northwind warranty. If it isn&apos;t right, send it back within 30 days — returns are always free.</p>
            <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>{p.specs.slice(0, 4).map(([k, v]) => <li key={k}><b style={{ color: 'var(--ink)' }}>{k}:</b> {v}</li>)}</ul>
          </div>
        )}
        {tab === 'specs' && (
          <table className="specs-table"><tbody>
            {p.specs.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
            <tr><td>Brand</td><td>{p.brand}</td></tr><tr><td>SKU</td><td className="mono">{p.sku}</td></tr>
          </tbody></table>
        )}
        {tab === 'reviews' && reviews && (
          <div>
            <div className="rev-summary">
              <div className="rev-big"><div className="n">{reviews.rating}</div><Stars value={reviews.rating} size={17} /><div className="text-muted" style={{ fontSize: 12.5, marginTop: 6 }}>{reviews.total.toLocaleString()} ratings</div></div>
              <div className="rev-bars">{reviews.distribution.map((pct, i) => (
                <div className="rev-bar" key={i}><span style={{ width: 34 }}>{5 - i} ★</span><div className="track"><div className="fill" style={{ width: pct + '%' }} /></div><span className="text-muted mono" style={{ width: 32, textAlign: 'right' }}>{pct}%</span></div>
              ))}</div>
            </div>
            <div>{reviews.reviews.map((rv, i) => (
              <div className="review" key={i}>
                <div className="rev-head"><div className="rev-avatar">{rv.name[0]}</div><div className="grow"><div className="flex between center"><span className="rev-name">{rv.name}</span><span className="rev-date">{rv.date}</span></div><div className="flex center gap-8"><Stars value={rv.rating} />{rv.verified && <span className="rev-verified"><Icon name="check" size={13} /> Verified purchase</span>}</div></div></div>
                <strong style={{ fontSize: 14 }}>{rv.title}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{rv.body}</p>
              </div>
            ))}</div>
          </div>
        )}
      </section>

      {cat && related.length > 0 && (
        <section className="section" style={{ paddingTop: 18 }}>
          <SectionHead title="You might also like" action={{ label: 'More in ' + cat.name, to: `/c/${cat.slug}` }} />
          <div className="pgrid cols-6">{related.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </main>
  );
}
