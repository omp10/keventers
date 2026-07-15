/**
 * Build a case-insensitive multi-field text search fragment.
 *
 *   buildSearch('choc', ['name', 'description'])
 *   → { $or: [ { name: { $regex: 'choc', $options: 'i' } },
 *              { description: { $regex: 'choc', $options: 'i' } } ] }
 *
 * Returns an empty object when there is nothing to search, so it can be spread
 * safely into a larger filter.
 *
 * @param {string} term
 * @param {string[]} fields
 * @returns {Record<string, unknown>}
 */
export function buildSearch(term, fields = []) {
  if (!term || typeof term !== 'string' || fields.length === 0) return {};

  // Escape regex metacharacters in user input.
  const safe = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safe) return {};

  return {
    $or: fields.map((field) => ({ [field]: { $regex: safe, $options: 'i' } })),
  };
}

export default buildSearch;
