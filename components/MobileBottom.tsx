'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

export function MobileBottom() {
  const s = useStore();
  const path = s.pathname;
  const isCat = path.startsWith('/c/') || path.startsWith('/search');

  const Item = ({
    icon,
    label,
    on,
    badge,
    action,
  }: {
    icon: string;
    label: string;
    on: boolean;
    badge?: number;
    action: () => void;
  }) => (
    <button className={on ? 'on' : ''} onClick={action}>
      <Icon name={icon} size={21} fill={on ? 'current' : 'none'} />
      {badge ? <span className="count">{badge}</span> : null}
      {label}
    </button>
  );

  return (
    <nav className="mobile-bottom">
      <Item icon="store" label="Home" on={path === '/'} action={() => s.navigate('/')} />
      <Item icon="grid" label="Categories" on={isCat} action={() => s.navigate('/c/all')} />
      {s.isAuthed && (
        <Item icon="heart" label="Saved" on={path === '/wishlist'} badge={s.wishlist.length} action={() => s.navigate('/wishlist')} />
      )}
      <Item icon="cart" label="Cart" on={path === '/cart'} badge={s.cartCount} action={() => s.openCart()} />
      <Item icon="user" label="Account" on={path === '/account' || path === '/orders'} action={() => s.navigate('/account')} />
    </nav>
  );
}
