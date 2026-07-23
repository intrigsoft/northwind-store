import { flashSaleView } from '@/server/flash';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** GET /api/flash — the live flash sale: curated items, end time, claimed stock. */
export async function GET() {
  return json(flashSaleView());
}
