import type { NextRequest } from 'next/server';
import { upstreamImageUrl, IMG } from '@/server/catalog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/images/:key?w=&v=
 *
 * Streams product imagery through the backend. The client only ever references
 * this same-origin route (see `Product.images`), so the storefront bundle holds
 * no upstream image URLs at all — every byte is served by "the backend". The
 * upstream CDN is an internal detail of this handler.
 *
 * A fresh page paints ~30 images at once. Hitting the public CDN with that burst
 * gets some requests throttled, so we (a) cap how many upstream fetches run at
 * once and (b) retry a few times. If the CDN still won't cooperate we return a
 * neutral SVG placeholder with HTTP 200 (not 502) so the browser console stays
 * clean — and with `no-store` so the next load retries the real photo.
 */

// ── In-process concurrency limiter (per server process) ─────────────────────--
const MAX_CONCURRENT = 6;
let active = 0;
const waiters: Array<() => void> = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#eeeeef"/><rect x="22" y="22" width="20" height="20" rx="4" fill="#dededf"/></svg>`;

function placeholder(): Response {
  return new Response(PLACEHOLDER, {
    status: 200,
    headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(key in IMG)) return placeholder();

  const sp = req.nextUrl.searchParams;
  const w = Math.min(1600, Math.max(40, Number(sp.get('w')) || 800));
  const v = Number(sp.get('v')) || 0;
  const url = upstreamImageUrl(key, w, v);

  const upstream = await withSlot(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          // Cache successful fetches; product imagery is immutable per key/size.
          next: { revalidate: 60 * 60 * 24 },
        });
        if (res.ok && res.body) return res;
      } catch {
        // transient — fall through to retry
      }
      // brief backoff before retrying (jitter by attempt + variant)
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1) + v * 10));
    }
    return null;
  });

  if (!upstream || !upstream.body) return placeholder();

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
