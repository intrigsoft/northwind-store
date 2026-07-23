'use client';

import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { SummaryRows } from '@/components/SummaryRows';
import { money } from '@/lib/format';

export default function CartPage() {
  const s = useStore();
  const [code, setCode] = useState('');
  const cart = s.cart;

  if (!cart || cart.lines.length === 0) {
    return (
      <main className="wrap section">
        <div className="empty">
          <div className="empty-ic"><Icon name="cart" size={30} /></div>
          <h3>Your cart is empty</h3>
          <p>Once you add items they&apos;ll show up here, ready for checkout.</p>
          <button className="btn btn-primary btn-lg" onClick={() => s.navigate('/c/all')}>Start shopping</button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap section" style={{ paddingTop: 22 }}>
      <div className="page-head" style={{ padding: '0 0 18px' }}>
        <h1>Your cart</h1>
        <p className="text-muted" style={{ margin: '6px 0 0' }}>{cart.count} {cart.count === 1 ? 'item' : 'items'} in your cart</p>
      </div>
      <div className="cart-layout">
        <div>
          <div className="cart-box">
            {cart.lines.map((l) => {
              const p = l.product;
              return (
                <div className="cart-line" key={l.lineId}>
                  <div className="cart-line-media" style={{ cursor: 'pointer' }} onClick={() => s.navigate(`/p/${p.id}`)}><ProductImage src={p.images[0]} tint={p.tint} /></div>
                  <div className="cart-line-info">
                    <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>{p.brand}</span>
                    <span className="ttl" style={{ cursor: 'pointer' }} onClick={() => s.navigate(`/p/${p.id}`)}>{p.title}</span>
                    {l.opt && <div className="cart-line-opts"><span>{l.opt}</span></div>}
                    <span className="stock-line" style={{ fontSize: 12.5 }}><span className="stock-dot" />In stock</span>
                    <div className="cart-line-actions">
                      <button className="link-btn" onClick={() => { void s.toggleWish(p.id); void s.removeFromCart(l.lineId); }}><Icon name="heart" size={15} /> Save for later</button>
                      <button className="link-btn" onClick={() => void s.removeFromCart(l.lineId)}><Icon name="trash" size={15} /> Remove</button>
                    </div>
                  </div>
                  <div className="cart-line-right">
                    <span className="price" style={{ fontSize: 17, color: 'var(--price)' }}>{money(l.lineTotal)}</span>
                    <div className="qty-sm">
                      <button onClick={() => void s.updateQty(l.lineId, l.qty - 1)}><Icon name="minus" size={14} /></button>
                      <span>{l.qty}</span>
                      <button onClick={() => void s.updateQty(l.lineId, l.qty + 1)}><Icon name="plus" size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => s.navigate('/c/all')}><Icon name="chevL" size={16} /> Continue shopping</button>
        </div>

        <aside className="summary">
          <h3>Order summary</h3>
          <div className="promo-input">
            <input className="input" placeholder="Promo code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button className="btn btn-outline" onClick={() => code && void s.applyPromo(code)}>Apply</button>
          </div>
          {cart.promo && (
            cart.promo.eligible ? (
              <div className="promo-note ok" style={{ fontSize: 12.5, color: 'var(--accent)', margin: '2px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="check" size={14} /> {cart.promo.code} applied — {cart.promo.description}
              </div>
            ) : (
              <div className="promo-note warn" style={{ fontSize: 12.5, color: 'var(--text-muted, #8a8f98)', margin: '2px 0 8px' }}>
                {cart.promo.reason ?? `${cart.promo.code} isn't eligible for this cart yet.`}
              </div>
            )
          )}
          {cart.totals.amountToFreeShipping > 0 && (
            <div className="promo-note" style={{ fontSize: 12.5, color: 'var(--ink)', margin: '2px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="truck" size={14} /> Add {money(cart.totals.amountToFreeShipping)} more for free shipping
            </div>
          )}
          <SummaryRows totals={cart.totals} promo={cart.promo} />
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={() => s.navigate('/checkout')}>Proceed to checkout</button>
          <div className="trust-row"><Icon name="lock" size={15} /><span style={{ fontSize: 12.5 }}>Secure SSL checkout</span></div>
          <div className="flex gap-8 center" style={{ justifyContent: 'center', marginTop: 12 }}>
            {['VISA', 'MC', 'AMEX', 'PAYPAL'].map((x) => <span key={x} className="pay-badge">{x}</span>)}
          </div>
        </aside>
      </div>
    </main>
  );
}
