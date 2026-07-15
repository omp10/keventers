/**
 * Build a transport-ready paginated payload from a repository PageResult.
 * Controllers pass this straight to ApiResponse.success as `data`, keeping the
 * envelope consistent across every list endpoint.
 *
 * @template T
 * @param {import('#core/types/pagination.js').PageResult<T>} pageResult
 * @param {(item: T) => unknown} [mapItem] Optional item → DTO mapper.
 * @returns {{ items: unknown[], pagination: import('#core/types/pagination.js').PageMeta }}
 */
export function buildPaginatedResponse(pageResult, mapItem) {
  const items = mapItem ? pageResult.items.map(mapItem) : pageResult.items;
  return { items, pagination: pageResult.meta };
}

export default buildPaginatedResponse;
