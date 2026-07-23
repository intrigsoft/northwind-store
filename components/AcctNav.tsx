'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

const ITEMS: [string, string, string, string][] = [
  ['account', 'Profile', 'user', '/account'],
  ['orders', 'Orders & tracking', 'pkg', '/orders'],
  ['wishlist', 'Wishlist', 'heart', '/wishlist'],
];

export function AcctNav({ active }: { active: 'account' | 'orders' | 'wishlist' }) {
  const s = useStore();
  const u = s.user;
  // Wishlist is logged-in only — drop it from the nav for guests.
  const items = u ? ITEMS : ITEMS.filter(([k]) => k !== 'wishlist');
  return (
    <aside className="acct-side">
      <div className="acct-profile">
        {u ? (
          <div className="acct-avatar">{u.initials}</div>
        ) : (
          <div className="acct-avatar" style={{ background: 'var(--surface-3)', color: 'var(--muted)' }}><Icon name="user" size={22} /></div>
        )}
        <div>
          <div style={{ fontWeight: 700 }}>{u ? u.name : 'Guest'}</div>
          <div className="text-muted" style={{ fontSize: 12.5 }}>{u ? `Member since ${u.since}` : 'Not signed in'}</div>
        </div>
      </div>
      {!u && (
        <button className="btn btn-primary btn-block btn-sm" style={{ margin: '0 0 8px' }} onClick={() => s.openAuth('signin')}>Sign in / Sign up</button>
      )}
      <nav className="acct-nav">
        {items.map(([k, l, ic, to]) => (
          <button key={k} className={'acct-nav-item' + (active === k ? ' on' : '')} onClick={() => s.navigate(to)}>
            <Icon name={ic} size={18} /> {l}
            {k === 'wishlist' && s.wishlist.length > 0 && (
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7 }}>{s.wishlist.length}</span>
            )}
          </button>
        ))}
        {u && (
          <button className="acct-nav-item" onClick={() => void s.signOut()} style={{ marginTop: 6 }}><Icon name="refresh" size={18} /> Sign out</button>
        )}
      </nav>
    </aside>
  );
}
