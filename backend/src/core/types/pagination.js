/**
 * Pagination primitives shared by the repository and service layers.
 *
 * @typedef {object} PageRequest
 * @property {number} page   1-based page number.
 * @property {number} limit  Items per page.
 * @property {number} skip   Derived offset.
 *
 * @typedef {object} PageMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 * @property {boolean} hasNext
 * @property {boolean} hasPrev
 *
 * @template T
 * @typedef {object} PageResult
 * @property {T[]} items
 * @property {PageMeta} meta
 */

export const PAGINATION_DEFAULTS = Object.freeze({
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
});

/**
 * Normalize arbitrary (often query-string) input into a safe PageRequest.
 * @param {{ page?: number|string, limit?: number|string }} [input]
 * @returns {PageRequest}
 */
export function toPageRequest(input = {}) {
  const page = Math.max(Number.parseInt(input.page, 10) || PAGINATION_DEFAULTS.PAGE, 1);
  const rawLimit = Number.parseInt(input.limit, 10) || PAGINATION_DEFAULTS.LIMIT;
  const limit = Math.min(Math.max(rawLimit, 1), PAGINATION_DEFAULTS.MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Build page metadata from a total count.
 * @param {{ page: number, limit: number }} pageRequest
 * @param {number} total
 * @returns {PageMeta}
 */
export function buildPageMeta({ page, limit }, total) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
