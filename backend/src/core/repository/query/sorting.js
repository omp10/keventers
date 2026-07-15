/**
 * Translate a sort spec into a Mongoose sort object.
 * Accepts:
 *   - string:  "createdAt:desc,name:asc"  or  "-createdAt name"
 *   - object:  { createdAt: -1, name: 1 }
 *
 * `allowedFields` (optional) whitelists sortable fields to prevent clients
 * sorting on arbitrary/indexed-unfriendly columns.
 *
 * @param {string|Record<string, number|string>} sort
 * @param {object} [options]
 * @param {string[]} [options.allowedFields]
 * @param {Record<string, number>} [options.defaultSort]
 * @returns {Record<string, 1|-1>}
 */
export function buildSort(sort, { allowedFields, defaultSort = { createdAt: -1 } } = {}) {
  if (!sort) return defaultSort;

  const entries = [];

  if (typeof sort === 'string') {
    for (const token of sort.split(/[,\s]+/).filter(Boolean)) {
      if (token.includes(':')) {
        const [field, dir] = token.split(':');
        entries.push([field, dir?.toLowerCase() === 'desc' ? -1 : 1]);
      } else if (token.startsWith('-')) {
        entries.push([token.slice(1), -1]);
      } else {
        entries.push([token, 1]);
      }
    }
  } else if (typeof sort === 'object') {
    for (const [field, dir] of Object.entries(sort)) {
      const normalized = dir === -1 || dir === '-1' || `${dir}`.toLowerCase() === 'desc' ? -1 : 1;
      entries.push([field, normalized]);
    }
  }

  const filtered = allowedFields
    ? entries.filter(([field]) => allowedFields.includes(field))
    : entries;

  if (filtered.length === 0) return defaultSort;
  return Object.fromEntries(filtered);
}

export default buildSort;
