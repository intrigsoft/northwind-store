'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

export function AuthGate({
  icon = 'user',
  title,
  desc,
  benefits,
}: {
  icon?: string;
  title: string;
  desc: string;
  benefits?: string[];
}) {
  const s = useStore();
  return (
    <div className="gate">
      <div className="gate-ic"><Icon name={icon} size={32} /></div>
      <h2>{title}</h2>
      <p>{desc}</p>
      <div className="flex gap-12" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={() => s.openAuth('signin')}>Sign in</button>
        <button className="btn btn-outline btn-lg" onClick={() => s.openAuth('signup')}>Create account</button>
      </div>
      {benefits && (
        <div className="gate-benefits">
          {benefits.map((b) => <div className="gate-benefit" key={b}><Icon name="check" size={18} /> {b}</div>)}
        </div>
      )}
    </div>
  );
}
