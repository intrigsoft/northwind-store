'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ListingView } from '@/components/pages/ListingView';

function SearchInner() {
  const sp = useSearchParams();
  return <ListingView category={sp.get('cat') ?? 'all'} query={sp.get('q') ?? ''} />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="wrap section"><p className="text-muted">Searching…</p></main>}>
      <SearchInner />
    </Suspense>
  );
}
