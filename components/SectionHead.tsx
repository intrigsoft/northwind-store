'use client';

import type { ReactNode } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

export function SectionHead({
  icon,
  title,
  sub,
  action,
  children,
}: {
  icon?: string;
  title: string;
  sub?: string;
  action?: { label: string; to: string };
  children?: ReactNode;
}) {
  const s = useStore();
  return (
    <div className="section-head">
      <div className="flex center gap-16" style={{ flexWrap: 'wrap' }}>
        <h2>
          {icon && <Icon name={icon} size={22} style={{ color: 'var(--brand)' }} />}
          {title}
        </h2>
        {sub && <span className="sub">{sub}</span>}
        {children}
      </div>
      {action && (
        <a
          className="see-all"
          href={action.to}
          onClick={(e) => {
            e.preventDefault();
            s.navigate(action.to);
          }}
        >
          {action.label} <Icon name="arrowR" size={15} />
        </a>
      )}
    </div>
  );
}
