'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductCard } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';
import { SectionHead } from '@/components/SectionHead';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import type { Product, Voucher, FlashSaleView } from '@/lib/types';

// Counts down to the flash sale's real end time (epoch ms from the backend),
// so "Ending in" reflects an actual deadline rather than a cosmetic timer.
function Countdown({ endsAt }: { endsAt: number }) {
  const calc = () => {
    const s = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  };
  const [t, setT] = useState<number[]>([0, 0, 0]);
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="countdown">
      <span className="lbl">Ending in</span>
      <span className="cd-box">{pad(t[0])}</span><span className="cd-sep">:</span>
      <span className="cd-box">{pad(t[1])}</span><span className="cd-sep">:</span>
      <span className="cd-box">{pad(t[2])}</span>
    </div>
  );
}

// label, category, title keyword to resolve a representative product image
const CIRCLES: [string, string, string][] = [
  ['Headphones', 'electronics', 'headphones'], ['Earbuds', 'electronics', 'earbuds'],
  ['Laptops', 'electronics', 'laptop'], ['Cameras', 'electronics', 'camera'],
  ['Watches', 'fashion', 'watch'], ['Kitchen', 'home', 'skillet'],
  ['Bedding', 'home', 'duvet'], ['Sneakers', 'fashion', 'sneakers'],
  ['Skincare', 'beauty', 'serum'], ['Outdoors', 'sports', 'bottle'],
];

export default function HomePage() {
  const s = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [flash, setFlash] = useState<FlashSaleView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts({}).then((r) => { setProducts(r.products); setLoading(false); }).catch(() => setLoading(false));
    api.getVouchers().then((r) => setVouchers(r.vouchers)).catch(() => undefined);
    api.getFlash().then(setFlash).catch(() => undefined);
  }, []);

  // Copy a promo code to the clipboard and offer to apply it to the cart.
  // Applying routes through the same eligibility-checked endpoint, so an
  // empty/under-minimum cart gets a helpful "spend $X more" toast.
  const claimCode = async (code: string) => {
    try { await navigator.clipboard?.writeText(code); } catch { /* clipboard may be blocked */ }
    s.toast(`Copied ${code}`, {
      action: {
        label: 'Apply to cart',
        onClick: () => void s.applyPromo(code).then((ok) => { if (ok) s.navigate('/cart'); }),
      },
    });
  };
  const claimVoucher = (v: Voucher) => void claimCode(v.code);

  const { best, fresh, byCat } = useMemo(() => {
    const best = products.filter((p) => p.badges.includes('best')).slice(0, 6);
    // Genuinely new arrivals only — no padding with older stock.
    const fresh = products.filter((p) => p.badges.includes('new')).slice(0, 6);
    const byCat = (cat: string) => products.find((p) => p.category === cat);
    return { best, fresh, byCat };
  }, [products]);

  const pick = (kw: string, cat: string) =>
    products.find((p) => p.title.toLowerCase().includes(kw)) ?? byCat(cat);

  const heroTech = byCat('electronics');
  const heroBeauty = byCat('beauty');

  if (loading) {
    return <main className="wrap section"><p className="text-muted">Loading the storefront…</p></main>;
  }

  return (
    <main>
      {/* HERO */}
      <section className="wrap">
        <div className="home-hero">
          <div className="hero-cats">
            {s.categories.map((c) => (
              <a key={c.slug} className="hero-cat" href={`/c/${c.slug}`} onClick={(e) => { e.preventDefault(); s.navigate(`/c/${c.slug}`); }}>
                <Icon name={c.icon} size={18} /> {c.name} <Icon name="chevR" size={14} style={{ marginLeft: 'auto' }} />
              </a>
            ))}
          </div>
          <div className="hero-banner">
            {heroTech && <ProductImage src={heroTech.images[0]} tint="hsl(212 24% 86%)" alt="" />}
            <div className="hero-banner-copy">
              <div className="eyebrow">Mid-Season Sale · up to 50% off</div>
              <h1>Everything you love,<br />for less.</h1>
              <p>Thousands of deals across electronics, home, fashion and more — refreshed daily.</p>
              <button className="btn btn-primary btn-lg" onClick={() => s.navigate('/c/all')}>Shop all deals</button>
            </div>
          </div>
          <div className="hero-side">
            <a className="hero-side-card" href="/c/electronics" onClick={(e) => { e.preventDefault(); s.navigate('/c/electronics'); }}>
              {heroTech && <ProductImage src={heroTech.images[0]} tint="hsl(212 24% 86%)" />}
              <div className="hs-in"><h4>Tech Week</h4><span>New gadgets, lower prices</span></div>
            </a>
            <a className="hero-side-card" href="/c/beauty" onClick={(e) => { e.preventDefault(); s.navigate('/c/beauty'); }}>
              {heroBeauty && <ProductImage src={heroBeauty.images[0]} tint="hsl(300 18% 88%)" />}
              <div className="hs-in"><h4>Beauty Picks</h4><span>Best-selling skincare</span></div>
            </a>
          </div>
        </div>
      </section>

      {/* SERVICE STRIP */}
      <section className="wrap" style={{ marginTop: 14 }}>
        <div className="svc-strip">
          {([['truck', 'Free Shipping', 'Orders over $50'], ['refresh', '30-Day Returns', 'Shop with confidence'], ['shield', 'Buyer Protection', 'Secure payments'], ['headset', '24/7 Support', 'Here to help']] as [string, string, string][]).map(([ic, t, d]) => (
            <div className="svc-item" key={t}><span className="ic"><Icon name={ic} size={24} /></span><div><div className="t">{t}</div><div className="d">{d}</div></div></div>
          ))}
        </div>
      </section>

      {/* VOUCHERS */}
      <section className="wrap section" style={{ paddingBottom: 6 }}>
        <SectionHead icon="gift" title="Vouchers for you" sub="Tap to copy &amp; apply to your cart" />
        <div className="vouchers">
          {vouchers.map((v) => (
            <div className="voucher" key={v.code} onClick={() => void claimVoucher(v)} style={{ cursor: 'pointer' }} title={v.description}>
              <div className="v-amt"><div className="n">{v.amount}</div><div className="u">{v.unit}</div></div>
              <div className="v-body"><div className="v-t">{v.title}</div><div className="v-d">{v.condition}</div><span className="v-code">{v.code}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* FLASH SALE */}
      {flash && flash.items.length > 0 && (
        <section className="wrap section" style={{ paddingTop: 8 }}>
          <div className="flash">
            <div className="flash-head">
              <div className="flash-title"><Icon name="zap" size={24} fill="current" className="flash-bolt" /><h2>Flash Sale</h2></div>
              <Countdown endsAt={flash.endsAt} />
              <a className="flash-link" href="/c/all" onClick={(e) => { e.preventDefault(); s.navigate('/c/all'); }}>See all <Icon name="arrowR" size={15} /></a>
            </div>
            <div className="flash-rail">
              {flash.items.map((it) => {
                const p = it.product;
                return (
                  <div className="flash-card" key={p.id} onClick={() => s.navigate(`/p/${p.id}`)} style={{ cursor: 'pointer', opacity: it.soldOut ? 0.55 : 1 }}>
                    <div className="fc-media"><ProductImage src={p.images[0]} tint={p.tint} alt={p.title} /></div>
                    <div className="fc-body">
                      <div><span className="fc-price">{money(it.price)}</span>{it.compareAt && <span className="fc-was">{money(it.compareAt)}</span>}</div>
                      <div className="flash-bar"><div className="fill" style={{ width: it.pctClaimed + '%' }} /><span className="ftxt">{it.soldOut ? 'Sold out' : `${it.pctClaimed}% claimed`}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORY CIRCLES */}
      <section className="wrap section" style={{ paddingTop: 4 }}>
        <SectionHead icon="grid" title="Shop by category" action={{ label: 'All categories', to: '/c/all' }} />
        <div className="cat-circles">
          {CIRCLES.map(([name, cat, kw]) => {
            const rep = pick(kw, cat);
            // Each circle is a real keyword search scoped to its category, so
            // "Headphones" and "Earbuds" land on genuinely different results.
            const to = `/search?q=${encodeURIComponent(kw)}&cat=${cat}`;
            return (
              <a key={name} className="cat-circle" href={to} onClick={(e) => { e.preventDefault(); s.navigate(to); }}>
                <span className="ic"><ProductImage src={rep?.images[0]} tint="hsl(30 15% 90%)" /></span>
                <span>{name}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* PROMO STRIP CTA */}
      <section className="wrap">
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '20px 28px', flexWrap: 'wrap', background: 'linear-gradient(110deg, var(--brand), var(--brand-2))', borderColor: 'transparent', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center' }}><Icon name="gift" size={24} /></span>
            <div><h3 style={{ color: '#fff', fontSize: 20 }}>New here? Get 10% off</h3><p style={{ margin: 0, opacity: 0.92, fontSize: 14 }}>Use code <b className="mono">NORTH10</b> on your first order over $30</p></div>
          </div>
          <button className="btn btn-lg btn-dark" style={{ background: '#fff', color: 'var(--brand)' }} onClick={() => void claimCode('NORTH10')}>Claim now</button>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="wrap section">
        <SectionHead icon="spark" title="Best sellers" sub="Most loved this week" action={{ label: 'See all', to: '/c/all' }} />
        <div className="pgrid cols-6">{best.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <SectionHead icon="tag" title="New arrivals" sub="Fresh in the catalogue" action={{ label: 'See all', to: '/c/all' }} />
        <div className="pgrid cols-6">{fresh.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      {/* JUST FOR YOU */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <div className="section-head"><h2><Icon name="heart" size={22} style={{ color: 'var(--brand)' }} fill="current" /> Just for you</h2></div>
        <div className="pgrid cols-6">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-outline btn-lg" onClick={() => s.navigate('/c/all')}>Browse all products <Icon name="arrowR" size={16} /></button>
        </div>
      </section>
    </main>
  );
}
