'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ProductImage } from '@/components/ProductImage';
import { AcctNav } from '@/components/AcctNav';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import type { OrderView, ReturnRequest } from '@/lib/types';

// Reasons offered when starting a return (UI list; the server accepts any text).
const RETURN_REASONS = [
  'Item arrived damaged',
  'Wrong item sent',
  'Not as described',
  'No longer needed',
  'Better price elsewhere',
];

export default function OrdersPage() {
  const s = useStore();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  // Returns raised in this session, keyed by orderId, plus the open return panel.
  const [returns, setReturns] = useState<Record<string, ReturnRequest>>({});
  const [returning, setReturning] = useState<string | null>(null);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    Promise.all([api.getOrders(), api.getReturns().catch(() => ({ returns: [] as ReturnRequest[] }))])
      .then(([o, r]) => {
        setOrders(o.orders);
        setReturns(Object.fromEntries(r.returns.map((x) => [x.orderId, x])));
        setOpen((cur) => cur ?? o.orders[0]?.id ?? null);
        setLoading(false);
      }).catch(() => setLoading(false));

  useEffect(() => { window.scrollTo(0, 0); void load(); /* eslint-disable-next-line */ }, []);

  const buyAgain = async (o: OrderView) => {
    await api.reorder(o.id);
    await s.refreshCart();
    s.toast('Items added to cart', { action: { label: 'View cart', onClick: () => s.navigate('/cart') } });
  };

  const doCancel = async (o: OrderView) => {
    try {
      await api.cancelOrder(o.id);
      await load();
      s.toast(`Order ${o.id} cancelled`);
    } catch (e) {
      s.toast(e instanceof Error ? e.message : 'Could not cancel the order.');
    }
  };

  const submitReturn = async (orderId: string) => {
    setSubmitting(true);
    try {
      const { return: ret } = await api.startReturn(orderId, reason);
      setReturns((m) => ({ ...m, [orderId]: ret }));
      setReturning(null);
      s.toast(`Return started · ${ret.id}`);
    } catch (e) {
      s.toast(e instanceof Error ? e.message : 'Could not start the return.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !s.isAuthed && orders.length === 0) {
    return (
      <main className="wrap section" style={{ paddingTop: 22 }}>
        <div className="page-head" style={{ padding: '0 0 8px' }}><h1>Orders & tracking</h1></div>
        <AuthGate icon="pkg" title="Sign in to see your orders" desc="Track deliveries, view your history and reorder in one tap. Your cart stays with you." benefits={['Real-time delivery tracking', 'Full order history', 'One-tap reorder', 'Returns & refunds']} />
      </main>
    );
  }

  return (
    <main className="wrap section" style={{ paddingTop: 22 }}>
      <div className="page-head" style={{ padding: '0 0 22px' }}><h1>Orders & tracking</h1></div>
      <div className="account-layout">
        <AcctNav active="orders" />
        <div>
          {!s.isAuthed && orders.length > 0 && (
            <div className="guest-banner">
              <Icon name="user" size={20} className="gb-ic" />
              <div className="grow"><div className="gb-t">You&apos;re checking out as a guest</div><div className="gb-d">Sign in to keep this order in your history and track it anytime.</div></div>
              <button className="btn btn-primary btn-sm" onClick={() => s.openAuth('signup')}>Save my order</button>
            </div>
          )}
          {loading ? (
            <p className="text-muted">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="empty">
              <div className="empty-ic"><Icon name="pkg" size={30} /></div>
              <h3>No orders yet</h3>
              <p>When you place an order it&apos;ll show up here with live tracking.</p>
              <button className="btn btn-primary btn-lg" onClick={() => s.navigate('/c/all')}>Start shopping</button>
            </div>
          ) : (
            orders.map((o) => {
              const expanded = open === o.id;
              const itemCount = o.items.reduce((n, l) => n + l.qty, 0);
              return (
                <div className="order-card" key={o.id}>
                  <div className="order-top">
                    <div className="order-meta">
                      <div><div className="k">Order</div><div className="v">{o.id}</div></div>
                      <div><div className="k">Placed</div><div className="v" style={{ fontFamily: 'var(--f-body)', fontWeight: 600 }}>{o.date}</div></div>
                      <div><div className="k">Total</div><div className="v">{money(o.total)}</div></div>
                    </div>
                    <span className={'ostatus ' + o.status}>
                      <Icon name={o.status === 'delivered' ? 'check' : o.status === 'transit' ? 'truck' : o.status === 'cancelled' ? 'x' : 'clock'} size={15} />{o.statusLabel}
                    </span>
                  </div>
                  <div className="order-body">
                    <div className="flex between center" style={{ flexWrap: 'wrap', gap: 12 }}>
                      <div className="order-items">
                        {o.items.map((l, i) => (
                          <div className="order-thumb" key={i} title={l.product.title} style={{ cursor: 'pointer' }} onClick={() => s.navigate(`/p/${l.product.id}`)}><ProductImage src={l.product.images[0]} tint={l.product.tint} /></div>
                        ))}
                        <div className="col" style={{ justifyContent: 'center', marginLeft: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
                          <span className="text-muted" style={{ fontSize: 13 }}>{o.eta}</span>
                        </div>
                      </div>
                      <div className="order-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => setOpen(expanded ? null : o.id)}>{expanded ? 'Hide tracking' : 'Track order'}<Icon name={expanded ? 'chevD' : 'chevR'} size={15} /></button>
                        {o.status === 'delivered' ? (
                          <>
                            {returns[o.id] ? (
                              <span className="def-tag" title={returns[o.id].reason} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <Icon name="refresh" size={13} /> {returns[o.id].statusLabel} · {returns[o.id].id}
                              </span>
                            ) : (
                              <button className="btn btn-ghost btn-sm" onClick={() => { setReason(RETURN_REASONS[0]); setReturning(returning === o.id ? null : o.id); }}><Icon name="refresh" size={15} /> Return</button>
                            )}
                            <button className="btn btn-primary btn-sm" onClick={() => void buyAgain(o)}><Icon name="refresh" size={15} /> Buy again</button>
                          </>
                        ) : (
                          <>
                            {o.status === 'processing' && (
                              <button className="btn btn-ghost btn-sm" onClick={() => void doCancel(o)}><Icon name="x" size={15} /> Cancel</button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => s.toast('Support chat opened')}><Icon name="headset" size={15} /> Get help</button>
                          </>
                        )}
                      </div>
                    </div>
                    {returning === o.id && !returns[o.id] && (
                      <div className="flex center" style={{ gap: 10, flexWrap: 'wrap', marginTop: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Return this order</span>
                        <select className="select" style={{ width: 'auto', height: 38 }} value={reason} onChange={(e) => setReason(e.target.value)}>
                          {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button className="btn btn-primary btn-sm" disabled={submitting} onClick={() => void submitReturn(o.id)}>{submitting ? 'Submitting…' : 'Request return'}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setReturning(null)}>Cancel</button>
                        <span className="text-muted" style={{ fontSize: 12.5, flexBasis: '100%' }}>Refund of {money(o.total)} to your original payment once received.</span>
                      </div>
                    )}
                    {expanded && (
                      <>
                        <hr className="divider" style={{ margin: '4px 0 6px' }} />
                        <div className="flex between center" style={{ flexWrap: 'wrap', gap: 10 }}>
                          <strong style={{ fontSize: 14.5 }}>{o.status === 'delivered' ? 'Delivered' : o.status === 'transit' ? 'On its way' : o.status === 'cancelled' ? 'Cancelled' : 'Being prepared'}</strong>
                          <span className="text-muted mono" style={{ fontSize: 12.5 }}>Tracking: NW{o.id.replace(/\D/g, '')}US</span>
                        </div>
                        <div className="track">
                          {o.track.map((st, i) => (
                            <div className={'track-step ' + st.state} key={i}>
                              <div className="track-rail">
                                <div className="track-dot">{st.state === 'done' && <Icon name="check" size={10} style={{ color: '#fff', display: 'block', margin: '1px' }} />}</div>
                                {i < o.track.length - 1 && <div className="track-line" />}
                              </div>
                              <div className="track-content"><div className="tt">{st.t}</div><div className="td">{st.d}</div></div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
