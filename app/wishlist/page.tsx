'use client';

import { useEffect } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductCard } from '@/components/ProductCard';
import { AcctNav } from '@/components/AcctNav';

export default function WishlistPage() {
  const s = useStore();
  const items = s.wishlistItems;
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const addAll = async () => {
    for (const p of items) await s.addToCart(p.id, { silent: true });
    s.openCart();
  };

  // Wishlist is logged-in only. Guests who reach /wishlist directly get a
  // sign-in gate instead of the list. (Wait for `ready` so an authed user
  // reloading the page doesn't flash the gate before their session resolves.)
  if (s.ready && !s.isAuthed) {
    return (
      <main className="wrap section" style={{ paddingTop: 22 }}>
        <div className="empty" style={{ maxWidth: 460, margin: '40px auto' }}>
          <div className="empty-ic"><Icon name="heart" size={30} /></div>
          <h3>Sign in to view your wishlist</h3>
          <p>Save products to your wishlist and find them on any device once you sign in.</p>
          <button className="btn btn-primary btn-lg" onClick={() => s.openAuth('signin')}>Sign in / Sign up</button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap section" style={{ paddingTop: 22 }}>
      <div className="page-head flex between center" style={{ padding: '0 0 22px', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Wishlist</h1><p className="text-muted" style={{ margin: '6px 0 0' }}>{items.length} saved {items.length === 1 ? 'item' : 'items'}</p></div>
        {items.length > 0 && <button className="btn btn-primary" onClick={() => void addAll()}><Icon name="cart" size={17} /> Add all to cart</button>}
      </div>
      <div className="account-layout">
        <AcctNav active="wishlist" />
        <div>
          {items.length === 0 ? (
            <div className="empty">
              <div className="empty-ic"><Icon name="heart" size={30} /></div>
              <h3>No saved items yet</h3>
              <p>Tap the heart on any product to save it here for later.</p>
              <button className="btn btn-primary btn-lg" onClick={() => s.navigate('/c/all')}>Browse products</button>
            </div>
          ) : (
            <div className="pgrid cols-3">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </div>
      </div>
    </main>
  );
}
