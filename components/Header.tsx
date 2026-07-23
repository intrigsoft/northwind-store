'use client';

import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

const TRENDING = ['wireless earbuds', 'yoga mat', 'cast iron', 'running shoes', 'vitamin c'];

export function Header() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [mega, setMega] = useState(false);
  const [mobMenu, setMobMenu] = useState(false);
  const cats = s.categories;
  const curCat = s.pathname.startsWith('/c/') ? s.pathname.split('/')[2] : null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    s.navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="header">
      <div className="utility">
        <div className="wrap">
          <a href="/" onClick={(e) => { e.preventDefault(); s.toast('Seller centre (demo)'); }}><Icon name="store" size={14} /> Sell on {s.storeName}</a>
          <span className="sep" />
          <a href="/" onClick={(e) => { e.preventDefault(); s.toast('Become a supplier (demo)'); }}>Become a Supplier</a>
          <span className="sep" />
          <a href="/" onClick={(e) => { e.preventDefault(); s.toast('App download (demo)'); }}><Icon name="phone" size={14} /> Download App</a>
          <div className="right">
            {s.isAuthed && s.user ? (
              <>
                <a href="/account" onClick={(e) => { e.preventDefault(); s.navigate('/account'); }}><Icon name="user" size={14} /> Hi, {s.user.name.split(' ')[0]}</a>
                <span className="sep" />
                <a href="/" onClick={(e) => { e.preventDefault(); void s.signOut(); }}>Sign Out</a>
              </>
            ) : (
              <>
                <a href="/" onClick={(e) => { e.preventDefault(); s.openAuth('signin'); }}><Icon name="user" size={14} /> Sign In</a>
                <span className="sep" />
                <a href="/" onClick={(e) => { e.preventDefault(); s.openAuth('signup'); }}>Sign Up</a>
              </>
            )}
            <span className="sep" />
            <a href="/orders" onClick={(e) => { e.preventDefault(); s.navigate('/orders'); }}><Icon name="pkg" size={14} /> Track Order</a>
            <a href="/" onClick={(e) => { e.preventDefault(); s.toast('Help centre (demo)'); }}><Icon name="headset" size={14} /> Help</a>
            <a href="/" onClick={(e) => { e.preventDefault(); s.toast('Region: United States · USD'); }}><Icon name="globe" size={14} /> EN / USD</a>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="wrap">
          <button className="h-icon menu-btn" onClick={() => setMobMenu(true)} aria-label="Menu"><Icon name="menu" /></button>
          <a href="/" className="brand" onClick={(e) => { e.preventDefault(); s.navigate('/'); }}>
            <span className="brand-mark" /><span className="brand-name">{s.storeName}</span>
          </a>
          <div style={{ flex: 1, maxWidth: 680 }}>
            <form className="search" onSubmit={submit}>
              <input placeholder="Search for products, brands and categories…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="search-btn" type="submit" aria-label="Search"><Icon name="search" size={20} /></button>
            </form>
            <div className="search-suggest">
              {TRENDING.map((tw) => (
                <a key={tw} href="#" onClick={(e) => { e.preventDefault(); s.navigate(`/search?q=${encodeURIComponent(tw)}`); }}>{tw}</a>
              ))}
            </div>
          </div>
          <div className="header-actions">
            <button className="h-icon" onClick={() => (s.isAuthed ? s.navigate('/account') : s.openAuth('signin'))} aria-label="Account"><Icon name="user" /></button>
            {s.isAuthed && (
              <button className="h-icon" onClick={() => s.navigate('/wishlist')} aria-label="Wishlist"><Icon name="heart" />{s.wishlist.length > 0 && <span className="count">{s.wishlist.length}</span>}</button>
            )}
            <button className="h-icon" onClick={() => s.openCart()} aria-label="Cart"><Icon name="cart" />{s.cartCount > 0 && <span className="count">{s.cartCount}</span>}</button>
          </div>
        </div>
      </div>

      <div className="header-nav">
        <div className="wrap">
          <div style={{ position: 'relative' }} onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
            <button className="allcat" onClick={() => s.navigate('/c/all')}><Icon name="grid" size={18} /> All Categories <Icon name="chevD" size={15} /></button>
            {mega && (
              <div className="mega">
                {cats.map((c) => (
                  <a key={c.slug} className="mega-item" href={`/c/${c.slug}`} onClick={(e) => { e.preventDefault(); setMega(false); s.navigate(`/c/${c.slug}`); }}>
                    <span className="ic" style={{ background: `hsl(${c.hue} 40% 93%)`, color: `hsl(${c.hue} 38% 36%)` }}><Icon name={c.icon} size={17} /></span>
                    <span><div className="tt">{c.name}</div><div className="dd">{c.sub.slice(0, 3).join(' · ')}</div></span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <nav className="nav-cats">
            {cats.map((c) => (
              <a key={c.slug} href={`/c/${c.slug}`} className={'nav-link' + (curCat === c.slug ? ' active' : '')} onClick={(e) => { e.preventDefault(); s.navigate(`/c/${c.slug}`); }}>{c.name}</a>
            ))}
          </nav>
          <a href="/c/all" className="nav-promo" onClick={(e) => { e.preventDefault(); s.navigate('/c/all'); }}><Icon name="zap" size={15} fill="current" /> Flash Deals</a>
        </div>
      </div>

      <MobileSearch />
      {mobMenu && <MobileMenu close={() => setMobMenu(false)} />}
    </header>
  );
}

function MobileSearch() {
  const s = useStore();
  const [q, setQ] = useState('');
  return (
    <div className="mobile-search wrap" style={{ padding: '8px 12px', background: 'var(--brand-hover)' }}>
      <form className="search" onSubmit={(e) => { e.preventDefault(); s.navigate(`/search?q=${encodeURIComponent(q)}`); }}>
        <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="search-btn" type="submit" aria-label="Search"><Icon name="search" size={19} /></button>
      </form>
    </div>
  );
}

function MobileMenu({ close }: { close: () => void }) {
  const s = useStore();
  const go = (to: string) => { close(); s.navigate(to); };
  return (
    <>
      <div className="drawer-scrim" onClick={close} />
      <div className="drawer" style={{ left: 0, right: 'auto', animationName: 'slideInL' }}>
        <div className="drawer-head">
          <span className="brand"><span className="brand-mark" style={{ background: 'var(--brand)' }} /><span className="brand-name" style={{ color: 'var(--ink)' }}>{s.storeName}</span></span>
          <button className="btn-icon" onClick={close}><Icon name="x" /></button>
        </div>
        <div className="drawer-body">
          <div style={{ padding: '8px 0' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Categories</div>
            {s.categories.map((c) => <button key={c.slug} className="acct-nav-item" onClick={() => go(`/c/${c.slug}`)}><Icon name={c.icon} size={18} /> {c.name}</button>)}
          </div>
          <hr className="divider" />
          <div style={{ padding: '8px 0' }}>
            <button className="acct-nav-item" onClick={() => go('/account')}><Icon name="user" size={18} /> My account</button>
            <button className="acct-nav-item" onClick={() => go('/orders')}><Icon name="pkg" size={18} /> Orders & tracking</button>
            {s.isAuthed && (
              <button className="acct-nav-item" onClick={() => go('/wishlist')}><Icon name="heart" size={18} /> Wishlist</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
