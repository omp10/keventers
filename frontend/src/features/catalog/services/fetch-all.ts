import { capi } from '../catalog-scope';

/** Backend caps `limit` at 100; asking for more is a 422, not a bigger page. */
const PAGE_SIZE = 100;
/** Bound the loop so a broken `pagination` block can't spin forever. */
const MAX_PAGES = 50;

/**
 * Read EVERY page of a paginated collection into one array.
 *
 * The catalog's list endpoints are paginated (`{ items, pagination }`, default
 * limit 20), but the pickers built on them — the product editor's category and
 * modifier selects, the filter bars — are only correct when they can offer the
 * WHOLE set. Reading page 1 and calling it the list is the trap this exists to
 * close: it looks like it works right up until a restaurant has a 21st item,
 * and then the item simply isn't there, with no error to explain it.
 *
 * Only for bounded, human-authored collections (categories, menus, modifier
 * groups, add-ons). Products are unbounded — those page lazily via
 * `useInfiniteResource`.
 */
export async function fetchAll<T>(path: string, query: Record<string, unknown> = {}): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await capi.paginate<T>(path, { query: { ...query, page, limit: PAGE_SIZE } });
    out.push(...res.items);
    const totalPages = res.meta?.totalPages ?? 1;
    if (res.items.length < PAGE_SIZE || page >= totalPages) break;
  }
  return out;
}
