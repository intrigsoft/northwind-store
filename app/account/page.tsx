'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { AcctNav } from '@/components/AcctNav';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import type { OrderView } from '@/lib/types';

export default function AccountPage() {
  const s = useStore();
  const u = s.user;
  const [recent, setRecent] = useState<OrderView[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (u) api.getOrders().then((r) => setRecent(r.orders.slice(0, 2))).catch(() => setRecent([]));
  }, [u]);

  if (!u) {
    return (
      <main className="wrap section" style={{ paddingTop: 22 }}>
        <div className="page-head" style={{ padding: '0 0 8px' }}><h1>My account</h1></div>
        <AuthGate icon="user" title="Sign in to your account" desc="Manage your orders, addresses and payment methods — and check out faster every time." benefits={['Faster, saved-detail checkout', 'Track orders & deliveries', 'Saved addresses & cards', 'Synced wishlist & members-only deals']} />
      </main>
    );
  }

  const phone = u.addresses[0]?.phone ?? '';
  const totalOrders = u.orders + (u.isNew ? recent.length : 0);
  const stats: [string, string | number, string][] = [
    ['Total orders', totalOrders, 'pkg'],
    ['Saved items', s.wishlist.length, 'heart'],
    ['Member since', u.since, 'user'],
  ];

  return (
    <main className="wrap section" style={{ paddingTop: 22 }}>
      <div className="page-head" style={{ padding: '0 0 22px' }}><h1>My account</h1></div>
      <div className="account-layout">
        <AcctNav active="account" />
        <div className="col gap-24">
          {u.isNew && (
            <div className="guest-banner" style={{ background: 'var(--success-soft)', borderColor: 'var(--success)' }}>
              <Icon name="check" size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div className="grow"><div className="gb-t">Welcome to {s.storeName}, {u.name.split(' ')[0]}!</div><div className="gb-d">Your account is ready. Add an address to speed up checkout.</div></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {stats.map(([l, v, ic]) => (
              <div className="card" key={l} style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={ic} size={20} /></span>
                <div><div style={{ fontFamily: 'var(--f-head)', fontWeight: 700, fontSize: 20 }}>{v}</div><div className="text-muted" style={{ fontSize: 12.5 }}>{l}</div></div>
              </div>
            ))}
          </div>

          <section className="card" style={{ padding: 24 }}>
            <div className="flex between center" style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18 }}>Personal information</h3><button className="link-btn" style={{ color: 'var(--ink)' }} onClick={() => s.toast('Edit profile (demo)')}>Edit</button></div>
            <div className="form-grid">
              <div><label className="field-label">Full name</label><input className="input" defaultValue={u.name} /></div>
              <div><label className="field-label">Email</label><input className="input" defaultValue={u.email} /></div>
              <div><label className="field-label">Phone</label><input className="input" defaultValue={phone} placeholder="Add a phone number" /></div>
              <div><label className="field-label">Language</label><select className="select"><option>English (US)</option><option>Español</option></select></div>
            </div>
          </section>

          <section className="card" style={{ padding: 24 }}>
            <div className="flex between center" style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18 }}>Saved addresses</h3><button className="link-btn" style={{ color: 'var(--ink)' }} onClick={() => s.toast('Add address (demo)')}><Icon name="plus" size={15} /> Add</button></div>
            {u.addresses.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 14, padding: '8px 0' }}>No addresses saved yet. Add one for faster checkout.</div>
            ) : (
              <div className="address-grid">
                {u.addresses.map((a) => (
                  <div className="address-card" key={a.id}>
                    <div className="flex between center"><strong style={{ fontSize: 14.5 }}>{a.label}</strong>{a.default && <span className="def-tag">Default</span>}</div>
                    <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{a.name}<br />{a.line}<br />{a.city}<br />{a.country}<br />{a.phone}</div>
                    <div className="flex gap-12" style={{ marginTop: 4 }}><button className="link-btn" style={{ color: 'var(--ink)' }} onClick={() => s.toast('Edit address')}>Edit</button><button className="link-btn" onClick={() => s.toast('Remove address')}>Remove</button></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card" style={{ padding: 24 }}>
            <div className="flex between center" style={{ marginBottom: 18 }}><h3 style={{ fontSize: 18 }}>Payment methods</h3><button className="link-btn" style={{ color: 'var(--ink)' }} onClick={() => s.toast('Add card (demo)')}><Icon name="plus" size={15} /> Add</button></div>
            {u.cards.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 14, padding: '8px 0' }}>No cards saved. Add a card to check out faster.</div>
            ) : (
              <div className="address-grid">
                {u.cards.map((c) => (
                  <div className="pay-card" key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <span className="pay-badge" style={{ height: 30, minWidth: 50, fontSize: 12 }}>{c.brand}</span>
                    <div className="grow"><div style={{ fontWeight: 600, fontFamily: 'var(--f-mono)' }}>•••• {c.last4}</div><div className="text-muted" style={{ fontSize: 13 }}>Expires {c.exp}</div></div>
                    {c.default && <span className="def-tag">Default</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section className="card" style={{ padding: 24 }}>
              <div className="flex between center" style={{ marginBottom: 6 }}><h3 style={{ fontSize: 18 }}>Recent orders</h3><button className="see-all" onClick={() => s.navigate('/orders')}>View all <Icon name="arrowR" size={15} /></button></div>
              {recent.map((o) => (
                <div className="flex between center" key={o.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="flex center gap-12">
                    <div className="order-thumb" style={{ width: 46, height: 46 }}><ProductImage src={o.items[0]?.product.images[0]} tint={o.items[0]?.product.tint ?? 'var(--surface-3)'} /></div>
                    <div><div style={{ fontWeight: 600, fontFamily: 'var(--f-mono)', fontSize: 13.5 }}>{o.id}</div><div className="text-muted" style={{ fontSize: 13 }}>{o.date} · {money(o.total)}</div></div>
                  </div>
                  <span className={'ostatus ' + o.status} style={{ height: 26, fontSize: 12 }}>{o.statusLabel}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
