'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Stars } from '@/components/Stars';
import { ProductImage } from '@/components/ProductImage';
import { money, pctOff, kfmt } from '@/lib/format';
import type { Product } from '@/lib/types';

export function Badges({ list }: { list: string[] }) {
  return (
    <>
      {list.map((b) => {
        if (b === 'sale') return <span key={b} className="badge badge-sale">Sale</span>;
        if (b === 'new') return <span key={b} className="badge badge-new">New</span>;
        if (b === 'best') return <span key={b} className="badge badge-best">Top</span>;
        return null;
      })}
    </>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const s = useStore();
  const wished = s.inWishlist(p.id);
  return (
    <article className="pcard" onClick={() => s.navigate(`/p/${p.id}`)}>
      <div className="pcard-media">
        <ProductImage src={p.images[0]} tint={p.tint} label="product" alt={p.title} />
        {p.compareAt && <span className="pcard-disc">-{pctOff(p.price, p.compareAt)}%</span>}
        <div className="pcard-badges"><Badges list={p.badges} /></div>
        <button
          className={'pcard-wish' + (wished ? ' on' : '')}
          aria-label="Save"
          onClick={(e) => {
            e.stopPropagation();
            void s.toggleWish(p.id);
          }}
        >
          <Icon name="heart" size={16} fill={wished ? 'current' : 'none'} />
        </button>
      </div>
      <div className="pcard-body">
        <div className="pcard-title">
          {p.mall && <span className="tag-mall">Official</span>}
          {p.title}
        </div>
        <div className="pcard-price">
          <span className="now price">{money(p.price)}</span>
          {p.compareAt && <span className="was">{money(p.compareAt)}</span>}
        </div>
        {p.freeShip && (
          <span className="pcard-ship">
            <Icon name="truck" size={13} /> Free shipping
          </span>
        )}
        <div className="pcard-rating">
          <Stars value={p.rating} /> <span>{p.rating}</span>
          <span className="sold">{kfmt(p.sold)} sold</span>
        </div>
      </div>
    </article>
  );
}
