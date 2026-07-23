'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

const SERVICES: [string, string, string][] = [
  ['truck', 'Free & fast shipping', 'On eligible orders over $25'],
  ['refresh', 'Easy 30-day returns', 'Hassle-free refunds'],
  ['shield', 'Buyer protection', 'Secure, encrypted checkout'],
  ['headset', '24/7 customer care', "We're always here to help"],
];

export function Footer() {
  const s = useStore();
  const cols: [string, [string, string][]][] = [
    ['Categories', s.categories.map((c) => [c.name, `/c/${c.slug}`] as [string, string])],
    ['Customer Care', [['Help Centre', '/'], ['Track My Order', '/orders'], ['Shipping & Delivery', '/'], ['Returns & Refunds', '/'], ['Contact Us', '/']]],
    ['Northwind', [['About Us', '/'], ['Sell on Northwind', '/'], ['Become a Supplier', '/'], ['Careers', '/'], ['Press', '/']]],
  ];
  return (
    <footer className="footer">
      <div className="footer-svc">
        <div className="wrap">
          {SERVICES.map(([ic, t, d]) => (
            <div className="fsvc" key={t}><span className="ic"><Icon name={ic} size={20} /></span><div><div className="t">{t}</div><div className="d">{d}</div></div></div>
          ))}
        </div>
      </div>
      <div className="wrap footer-top">
        <div className="footer-brand">
          <span className="brand"><span className="brand-mark" /><span className="brand-name">{s.storeName}</span></span>
          <p>The marketplace for things worth keeping — curated quality, fair prices, and delivery you can count on.</p>
          <div className="app-badges">
            <div className="app-badge"><Icon name="phone" size={18} /><div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Download on the</div><b>App Store</b></div></div>
            <div className="app-badge"><Icon name="phone" size={18} /><div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Get it on</div><b>Google Play</b></div></div>
          </div>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <h5>{h}</h5>
            <div className="footer-links">
              {links.map(([t, to]) => (
                <a key={t} href={to} onClick={(e) => { e.preventDefault(); to.startsWith('/') && to.length > 1 ? s.navigate(to) : s.toast('Demo link'); }}>{t}</a>
              ))}
            </div>
          </div>
        ))}
        <div>
          <h5>Get deals first</h5>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>Subscribe for new arrivals and members-only vouchers.</p>
          <form className="newsletter" onSubmit={(e) => { e.preventDefault(); s.toast("You're subscribed!"); }}>
            <input className="input" placeholder="Email address" type="email" required />
            <button className="btn btn-primary" type="submit">Join</button>
          </form>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <p>© 2026 {s.storeName}. A demo storefront built for Dioschub. Not a real store.</p>
        <div className="footer-pays">{['VISA', 'MC', 'AMEX', 'PAYPAL', 'APPLE', 'GPAY'].map((p) => <span key={p} className="pay-badge">{p}</span>)}</div>
      </div>
    </footer>
  );
}
