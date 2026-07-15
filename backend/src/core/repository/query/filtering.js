/**
 * Build a safe MongoDB filter from a plain object of client-supplied criteria.
 *
 * Supports a compact operator suffix syntax so callers/controllers can express
 * range and set queries without leaking raw Mongo operators:
 *   { price__gte: 100, price__lte: 500, status__in: 'active,paused', name: 'x' }
 *   → { price: { $gte: 100, $lte: 500 }, status: { $in: ['active','paused'] }, name: 'x' }
 *
 * Only fields present in `allowedFields` (when provided) are included — this is
 * the guard against arbitrary/injected query keys.
 */
// NOTE: no `$regex` operator — it is a ReDoS vector and unused; free-text search
// goes through the dedicated (escaped) search builder instead.
const OPERATOR_MAP = {
  eq: '$eq',
  ne: '$ne',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  in: '$in',
  nin: '$nin',
  exists: '$exists',
};

/** Only scalar values may become filter operands — blocks NoSQL operator
 * injection (e.g. a caller passing `?status[$ne]=` yields an object value). */
function isPrimitive(v) {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
}

function coerce(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value)) && typeof value === 'string') {
    return Number(value);
  }
  return value;
}

/**
 * @param {Record<string, unknown>} criteria
 * @param {object} [options]
 * @param {string[]} [options.allowedFields]
 * @returns {Record<string, unknown>}
 */
export function buildFilter(criteria = {}, { allowedFields } = {}) {
  const filter = {};

  for (const [key, rawValue] of Object.entries(criteria)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    const [field, op] = key.split('__');
    if (allowedFields && !allowedFields.includes(field)) continue;

    if (!op) {
      // Reject object/array values here — a trusted scope value is always a
      // scalar; an object would be an injected operator payload.
      if (!isPrimitive(rawValue)) continue;
      filter[field] = coerce(rawValue);
      continue;
    }

    const mongoOp = OPERATOR_MAP[op];
    if (!mongoOp) continue;

    let value;
    if (op === 'in' || op === 'nin') {
      const list = typeof rawValue === 'string' ? rawValue.split(',') : Array.isArray(rawValue) ? rawValue : [rawValue];
      value = list.filter(isPrimitive).map((v) => coerce(typeof v === 'string' ? v.trim() : v));
    } else if (op === 'exists') {
      value = coerce(rawValue) === true;
    } else {
      if (!isPrimitive(rawValue)) continue; // scalar operands only
      value = coerce(rawValue);
    }

    filter[field] = { ...(filter[field] || {}), [mongoOp]: value };
  }

  return filter;
}

export default buildFilter;
