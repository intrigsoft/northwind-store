'use client';

import { use } from 'react';
import { ListingView } from '@/components/pages/ListingView';

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <ListingView category={slug} />;
}
