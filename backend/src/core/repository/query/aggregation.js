/**
 * Reusable aggregation-pipeline builders. These are generic, business-agnostic
 * stage factories that repositories compose — no domain knowledge here.
 */
export const Aggregation = {
  match(filter = {}) {
    return { $match: filter };
  },

  sort(sortSpec = { createdAt: -1 }) {
    return { $sort: sortSpec };
  },

  /**
   * Paginate within a pipeline using $skip + $limit.
   * @param {{ skip: number, limit: number }} page
   */
  paginate({ skip, limit }) {
    return [{ $skip: skip }, { $limit: limit }];
  },

  /**
   * Single-pass paginated result + total count via $facet.
   * Produces { items: [...], total: <n> }.
   * @param {{ skip: number, limit: number }} page
   * @param {object[]} [preStages] Stages applied before faceting (match/sort).
   */
  facetPaginate({ skip, limit }, preStages = []) {
    return {
      $facet: {
        items: [...preStages, { $skip: skip }, { $limit: limit }],
        totalCount: [...preStages, { $count: 'count' }],
      },
    };
  },

  /** Reshape a $facet result into { items, total }. */
  unwrapFacet(facetResult) {
    const doc = Array.isArray(facetResult) ? facetResult[0] : facetResult;
    return {
      items: doc?.items ?? [],
      total: doc?.totalCount?.[0]?.count ?? 0,
    };
  },

  lookup({ from, localField, foreignField, as }) {
    return { $lookup: { from, localField, foreignField, as } };
  },

  group(spec) {
    return { $group: spec };
  },

  project(spec) {
    return { $project: spec };
  },
};

export default Aggregation;
