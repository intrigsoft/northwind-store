/**
 * Client-facing types. These re-export the backend domain types verbatim so the
 * wire contract is shared and type-checked on both ends. `export type *` keeps
 * this import erasable — no server runtime is pulled into the client bundle.
 */
export type * from '@/server/types';
export type { SortKey, ProductQuery } from '@/server/queries';
