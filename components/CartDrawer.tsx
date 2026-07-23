'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { money } from '@/lib/format';

export function CartDrawer() {
  const s = useStore();
  if (!s.cartOpen) return null;
  const lines = s.cartLines;
  return (
    <>
      <div className="drawer-scrim" onClick={s.closeCart} />
      <div className="drawer">
        <div className="drawer-head">
          <h3>My Cart ({s.cartCount})</h3>
          <button className="btn-icon" onClick={s.closeCart} aria-label="Close"><Icon name="x" /></button>
        </div>
        {lines.length === 0 ? (
          <div className="drawer-body">
            <div className="empty">
              <div className="empty-ic"><Icon name="cart" size={28} /></div>
              <h3>Your cart is empty</h3>
              <p>Browse the catalogue and add something you love.</p>
              <button className="btn btn-primary" onClick={() => { s.closeCart(); s.navigate('/c/all'); }}>Start shopping</button>
            </div>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {lines.map((l) => {
                const p = l.product;
                return (
                  <div className="mini-cart-line" key={l.lineId}>
                    <div
                      style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', cursor: 'pointer' }}
                      onClick={() => { s.closeCart(); s.navigate(`/p/${p.id}`); }}
                    >
                      <ProductImage src={p.images[0]} tint={p.tint} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
                      {l.opt && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.opt}</div>}
                      <div className="qty-sm" style={{ marginTop: 7 }}>
                        <button onClick={() => void s.updateQty(l.lineId, l.qty - 1)}><Icon name="minus" size={13} /></button>
                        <span>{l.qty}</span>
                        <button onClick={() => void s.updateQty(l.lineId, l.qty + 1)}><Icon name="plus" size={13} /></button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <span className="price" style={{ fontSize: 14, color: 'var(--price)' }}>{money(l.lineTotal)}</span>
                      <button className="link-btn" onClick={() => void s.removeFromCart(l.lineId)}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="drawer-foot">
              <div className="sum-row total" style={{ border: 0, padding: '0 0 12px', marginTop: 0 }}>
                <span>Subtotal</span><span className="price">{money(s.cartSubtotal)}</span>
              </div>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => { s.closeCart(); s.navigate('/checkout'); }}>Checkout · {money(s.cartSubtotal)}</button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => { s.closeCart(); s.navigate('/cart'); }}>View full cart</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
