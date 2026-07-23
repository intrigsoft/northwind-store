'use client';

import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

export function Toaster() {
  const s = useStore();
  return (
    <div className="toast-wrap">
      {s.toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="tc"><Icon name="check" size={15} /></span>
          <span>{t.msg}</span>
          {t.action && (
            <a href="#" onClick={(e) => { e.preventDefault(); t.action!.onClick(); }}>{t.action.label}</a>
          )}
        </div>
      ))}
    </div>
  );
}
