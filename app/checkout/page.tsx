'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { SummaryRows } from '@/components/SummaryRows';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import type { ShippingMethod } from '@/lib/types';

const DELIVERY: [ShippingMethod, string, string][] = [
  ['standard', 'Standard', '3–5 business days'],
  ['express', 'Express', '1–2 business days'],
  ['nextday', 'Next day', 'Order before 4pm'],
];

export default function CheckoutPage() {
  const s = useStore();
  const u = s.user;
  const cart = s.cart;
  const savedAddrs = u?.addresses ?? [];

  const [addr, setAddr] = useState(savedAddrs[0]?.id ?? 'new');
  const [email, setEmail] = useState(u?.email ?? '');
  const [ship, setShip] = useState<ShippingMethod>('standard');
  const [pay, setPay] = useState<'card' | 'paypal'>('card');
  const [placing, setPlacing] = useState(false);

  // Stable callbacks — depend on these (not the whole store) to avoid refetch loops.
  const { refreshCart, navigate } = s;

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setEmail((e) => e || u?.email || ''); setAddr((a) => a === 'new' ? (u?.addresses[0]?.id ?? 'new') : a); }, [u]);

  // Keep the displayed totals in sync with the chosen shipping method (server-authoritative).
  useEffect(() => { void refreshCart(ship); }, [ship, refreshCart]);

  // Bounce to the cart if it's empty (unless we're mid-placement).
  useEffect(() => {
    if (!placing && cart && cart.lines.length === 0) navigate('/cart');
  }, [cart, placing, navigate]);

  if (!cart || cart.lines.length === 0) {
    return <main className="wrap section"><p className="text-muted">Your cart is empty.</p></main>;
  }

  const place = async () => {
    setPlacing(true);
    try {
      const { order } = await api.checkout({ email, shippingMethod: ship });
      await s.refreshCart();
      s.navigate(`/confirm/${order.id}`);
    } catch {
      setPlacing(false);
      s.toast('Could not place the order. Please try again.');
    }
  };

  const shipPrice = (m: ShippingMethod) =>
    m === 'express' ? '$9.99' : m === 'nextday' ? '$16.99' : cart.totals.subtotal >= 50 ? 'Free' : '$5.99';

  return (
    <main className="wrap section" style={{ paddingTop: 22 }}>
      <div className="breadcrumb">
        <a href="/cart" onClick={(e) => { e.preventDefault(); s.navigate('/cart'); }}>Cart</a><span className="sep">/</span><span>Checkout</span>
      </div>
      <div className="page-head" style={{ padding: '0 0 22px' }}><h1>Checkout</h1></div>

      <div className="checkout-layout">
        <div className="checkout-steps">
          <section className="co-section">
            <h3><span className="co-step-n">1</span> Contact</h3>
            {!u && (
              <div className="guest-banner" style={{ marginBottom: 16 }}>
                <Icon name="user" size={20} className="gb-ic" />
                <div className="grow"><div className="gb-t">Have an account?</div><div className="gb-d">Sign in for faster checkout with your saved details.</div></div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => s.openAuth('signin')}>Sign in</button>
              </div>
            )}
            <div className="form-grid">
              <div className="full"><label className="field-label">Email address</label><input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="full"><label className="field-label">Phone (for delivery updates)</label><input className="input" defaultValue={savedAddrs[0]?.phone ?? ''} placeholder="Phone number" /></div>
            </div>
          </section>

          <section className="co-section">
            <h3><span className="co-step-n">2</span> Shipping address</h3>
            {savedAddrs.length > 0 ? (
              <>
                <div className="col gap-12" style={{ marginBottom: 16 }}>
                  {savedAddrs.map((a) => (
                    <label key={a.id} className={'radio-card' + (addr === a.id ? ' on' : '')} onClick={() => setAddr(a.id)}>
                      <span className="dot" />
                      <div className="rc-main">
                        <div className="rc-t">{a.name} · <span className="text-muted" style={{ fontWeight: 500 }}>{a.label}</span></div>
                        <div className="rc-d">{a.line}, {a.city}, {a.country}</div>
                      </div>
                      {a.default && <span className="def-tag">Default</span>}
                    </label>
                  ))}
                </div>
                <button className="link-btn" style={{ color: 'var(--ink)' }} onClick={() => s.toast('New address form opened')}><Icon name="plus" size={15} /> Add a new address</button>
              </>
            ) : (
              <div className="form-grid">
                <div><label className="field-label">First name</label><input className="input" placeholder="Jane" /></div>
                <div><label className="field-label">Last name</label><input className="input" placeholder="Appleseed" /></div>
                <div className="full"><label className="field-label">Street address</label><input className="input" placeholder="123 Main St, Apt 4B" /></div>
                <div><label className="field-label">City</label><input className="input" placeholder="Portland" /></div>
                <div><label className="field-label">ZIP / Postal code</label><input className="input" placeholder="97204" /></div>
                <div className="full"><label className="field-label">Country</label><select className="select"><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Australia</option></select></div>
              </div>
            )}
          </section>

          <section className="co-section">
            <h3><span className="co-step-n">3</span> Delivery method</h3>
            <div className="col gap-12">
              {DELIVERY.map(([k, tl, d]) => (
                <label key={k} className={'radio-card' + (ship === k ? ' on' : '')} onClick={() => setShip(k)}>
                  <span className="dot" /><div className="rc-main"><div className="rc-t">{tl}</div><div className="rc-d">{d}</div></div><span className="rc-price">{shipPrice(k)}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="co-section">
            <h3><span className="co-step-n">4</span> Payment</h3>
            <div className="col gap-12" style={{ marginBottom: pay === 'card' ? 18 : 0 }}>
              <label className={'radio-card' + (pay === 'card' ? ' on' : '')} onClick={() => setPay('card')}><span className="dot" /><div className="rc-main"><div className="rc-t">Credit / debit card</div><div className="rc-d">Visa, Mastercard, Amex</div></div><Icon name="card" size={22} /></label>
              <label className={'radio-card' + (pay === 'paypal' ? ' on' : '')} onClick={() => setPay('paypal')}><span className="dot" /><div className="rc-main"><div className="rc-t">PayPal</div><div className="rc-d">Redirect to PayPal</div></div><span className="pay-badge">PAYPAL</span></label>
            </div>
            {pay === 'card' && (
              <div className="form-grid">
                <div className="full"><label className="field-label">Card number</label><input className="input mono" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" /></div>
                <div><label className="field-label">Expiry</label><input className="input mono" placeholder="MM / YY" defaultValue="08 / 28" /></div>
                <div><label className="field-label">CVC</label><input className="input mono" placeholder="123" defaultValue="123" /></div>
                <div className="full"><label className="field-label">Name on card</label><input className="input" defaultValue={u?.name ?? ''} placeholder="Full name" /></div>
              </div>
            )}
          </section>
        </div>

        <aside className="summary">
          <h3>Order summary</h3>
          <div style={{ maxHeight: 250, overflowY: 'auto', margin: '0 -4px 8px', padding: '0 4px' }}>
            {cart.lines.map((l) => (
              <div className="mini-line" key={l.lineId}>
                <div className="mini-media"><ProductImage src={l.product.images[0]} tint={l.product.tint} /><span className="mini-qty">{l.qty}</span></div>
                <div className="mini-info"><div className="t">{l.product.title}</div>{l.opt && <div className="o">{l.opt}</div>}</div>
                <span className="price" style={{ fontSize: 13.5 }}>{money(l.lineTotal)}</span>
              </div>
            ))}
          </div>
          <hr className="divider" style={{ margin: '8px 0 14px' }} />
          <SummaryRows totals={cart.totals} promo={cart.promo} />
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} disabled={placing} onClick={() => void place()}>
            {placing ? 'Placing order…' : <><Icon name="lock" size={17} /> Place order · {money(cart.totals.total)}</>}
          </button>
          <p className="text-muted" style={{ fontSize: 12, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>By placing your order you agree to Northwind&apos;s Terms and Privacy Policy.</p>
        </aside>
      </div>
    </main>
  );
}
