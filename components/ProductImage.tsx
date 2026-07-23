'use client';

import { useState, type CSSProperties } from 'react';

/**
 * Product image with a graceful tinted-placeholder fallback. `src` is a
 * same-origin `/api/images/...` URL served by the backend — this component
 * never knows the upstream source. If the backend image errors, we render the
 * product's tint colour instead of a broken icon.
 */
export function ProductImage({
  src,
  tint,
  label,
  alt,
}: {
  src?: string | null;
  tint: string;
  label?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className="ph" style={{ '--ph-bg': tint } as CSSProperties}>
        {label && <span className="ph-label">{label}</span>}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || ''} loading="lazy" onError={() => setFailed(true)} />;
}

export function Placeholder({
  tint,
  label,
  style,
}: {
  tint: string;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <div className="ph" style={{ '--ph-bg': tint, ...style } as CSSProperties}>
      {label && <span className="ph-label">{label}</span>}
    </div>
  );
}
