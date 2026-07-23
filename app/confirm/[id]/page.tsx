'use client';

import { use, useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import type { OrderView } from '@/lib/types';

export default function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.getOrder(id).then((r) => setOrder(r.order)).catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return <main className="wrap section"><div className="empty"><h3>No recent order</h3><button className="btn btn-primary" onClick={() => s.navigate('/')}>Back home</button></div></main>;
  }
  if (!order) {
    return <main className="wrap section"><p className="text-muted">Loading order…</p></main>;
  }

  return (
    <main className="wrap">
      <div className="confirm">
        <div className="confirm-check"><Icon name="check" size={38} /></div>
        <h1>Thank you for your order!</h1>
        <p>We&apos;ve emailed a confirmation to <b>{order.email && order.email !== 'guest' ? order.email : 'your email'}</b>. Your order is being prepared.</p>
        <div className="card confirm-card">
          <div className="flex between center" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div><div className="order-meta"><div><div className="k">Order number</div><div className="v">{order.id}</div></div><div><div className="k">Total paid</div><div className="v">{money(order.total)}</div></div><div><div className="k">Delivery</div><div className="v" style={{ fontFamily: 'var(--f-body)' }}>1–2 days</div></div></div></div>
            <span className="ostatus processing"><Icon name="clock" size={15} /> Processing</span>
          </div>
          <hr className="divider" style={{ margin: '18px 0' }} />
          {order.items.map((l, i) => (
            <div className="mini-line" key={i}>
              <div className="mini-media"><ProductImage src={l.product.images[0]} tint={l.product.tint} /><span className="mini-qty">{l.qty}</span></div>
              <div className="mini-info"><div className="t">{l.product.title}</div>{l.opt && <div className="o">{l.opt}</div>}</div>
              <span className="price" style={{ fontSize: 13.5 }}>{money(l.lineTotal)}</span>
            </div>
          ))}
        </div>
        {!s.user && (
          <div className="guest-banner" style={{ marginTop: 24, textAlign: 'left' }}>
            <Icon name="user" size={20} className="gb-ic" />
            <div className="grow"><div className="gb-t">Create an account to track this order</div><div className="gb-d">Save your details and get delivery updates — takes a few seconds.</div></div>
            <button className="btn btn-primary btn-sm" onClick={() => s.openAuth('signup')}>Create account</button>
          </div>
        )}
        <div className="flex gap-12" style={{ justifyContent: 'center', marginTop: 28 }}>
          <button className="btn btn-primary btn-lg" onClick={() => s.navigate('/orders')}><Icon name="pkg" size={18} /> Track your order</button>
          <button className="btn btn-outline btn-lg" onClick={() => s.navigate('/')}>Continue shopping</button>
        </div>
      </div>
    </main>
  );
}
