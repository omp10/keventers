import { buildPageMeta, toPageRequest } from '#core/types/pagination.js';

import { Aggregation } from './query/aggregation.js';
import { buildFilter } from './query/filtering.js';
import { buildSearch } from './query/search.js';
import { buildSort } from './query/sorting.js';

/**
 * Generic, reusable repository base. Every future module repository extends this
 * and is the ONLY layer that touches its Mongoose model / MongoDB.
 *
 * Features:
 *  - CRUD with transaction (session) pass-through
 *  - pagination / filtering / search / sorting helpers
 *  - soft-delete support (opt-in via `softDelete` flag)
 *  - generic aggregation entry point
 *  - Document → plain-object mapping (`toDomain`) so Mongoose types never leak
 *
 * @template T
 */
export class BaseRepository {
  /**
   * @param {import('mongoose').Model} model
   * @param {object} [options]
   * @param {boolean} [options.softDelete]  Enable soft-delete semantics.
   * @param {string}  [options.deletedField] Field marking deletion (default 'deletedAt').
   * @param {string[]} [options.searchableFields] Fields used by `search`.
   */
  constructor(model, { softDelete = false, deletedField = 'deletedAt', searchableFields = [] } = {}) {
    if (!model) throw new Error('BaseRepository requires a Mongoose model');
    this.model = model;
    this.softDelete = softDelete;
    this.deletedField = deletedField;
    this.searchableFields = searchableFields;
  }

  /** Map a Mongoose document to a plain domain object. Override to reshape. */
  toDomain(doc) {
    if (!doc) return null;
    return typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;
  }

  #mapMany(docs) {
    return docs.map((d) => this.toDomain(d));
  }

  /** Inject the soft-delete exclusion into a filter unless explicitly included. */
  #withSoftDelete(filter = {}, includeDeleted = false) {
    if (!this.softDelete || includeDeleted) return filter;
    return { ...filter, [this.deletedField]: { $in: [null, undefined] } };
  }

  #sessionOpt(options) {
    return options?.session ? { session: options.session } : {};
  }

  async create(data, options = {}) {
    const [doc] = await this.model.create([data], this.#sessionOpt(options));
    return this.toDomain(doc);
  }

  async insertMany(docs, options = {}) {
    const created = await this.model.insertMany(docs, this.#sessionOpt(options));
    return this.#mapMany(created);
  }

  async findById(id, options = {}) {
    const doc = await this.model
      .findOne(this.#withSoftDelete({ _id: id }, options.includeDeleted))
      .session(options.session ?? null);
    return this.toDomain(doc);
  }

  async findOne(filter = {}, options = {}) {
    const doc = await this.model
      .findOne(this.#withSoftDelete(filter, options.includeDeleted))
      .session(options.session ?? null);
    return this.toDomain(doc);
  }

  async find(filter = {}, options = {}) {
    const q = this.model
      .find(this.#withSoftDelete(filter, options.includeDeleted))
      .session(options.session ?? null);
    if (options.sort) q.sort(buildSort(options.sort));
    if (options.limit) q.limit(options.limit);
    if (options.select) q.select(options.select);
    return this.#mapMany(await q);
  }

  /**
   * Paginated query combining criteria filter + optional text search + sort.
   * @param {object} params
   * @param {object} [params.filter]   Raw criteria (passed through buildFilter).
   * @param {string} [params.search]   Free-text term (matched on searchableFields).
   * @param {string|object} [params.sort]
   * @param {{page?: number, limit?: number}} [params.pagination]
   * @param {string[]} [params.allowedFilterFields]
   * @param {object} [options]
   * @returns {Promise<import('#core/types/pagination.js').PageResult<T>>}
   */
  async paginate(
    { filter = {}, search, sort, pagination = {}, allowedFilterFields } = {},
    options = {},
  ) {
    const pageRequest = toPageRequest(pagination);
    const query = {
      ...this.#withSoftDelete(
        buildFilter(filter, { allowedFields: allowedFilterFields }),
        options.includeDeleted,
      ),
      ...buildSearch(search, this.searchableFields),
    };

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .sort(buildSort(sort))
        .skip(pageRequest.skip)
        .limit(pageRequest.limit)
        .session(options.session ?? null),
      this.model.countDocuments(query).session(options.session ?? null),
    ]);

    return { items: this.#mapMany(docs), meta: buildPageMeta(pageRequest, total) };
  }

  async updateById(id, patch, options = {}) {
    const doc = await this.model.findOneAndUpdate(
      this.#withSoftDelete({ _id: id }, options.includeDeleted),
      { $set: patch },
      { new: true, runValidators: true, ...this.#sessionOpt(options) },
    );
    return this.toDomain(doc);
  }

  async updateOne(filter, patch, options = {}) {
    return this.model.updateOne(
      this.#withSoftDelete(filter, options.includeDeleted),
      { $set: patch },
      this.#sessionOpt(options),
    );
  }

  /** Hard delete. For soft-delete semantics use softDeleteById. */
  async deleteById(id, options = {}) {
    const res = await this.model.deleteOne({ _id: id }, this.#sessionOpt(options));
    return res.deletedCount > 0;
  }

  /** Mark a document deleted (requires softDelete: true). */
  async softDeleteById(id, options = {}) {
    if (!this.softDelete) throw new Error('softDelete is not enabled on this repository');
    const doc = await this.model.findOneAndUpdate(
      { _id: id },
      { $set: { [this.deletedField]: new Date() } },
      { new: true, ...this.#sessionOpt(options) },
    );
    return this.toDomain(doc);
  }

  /** Reverse a soft delete. */
  async restoreById(id, options = {}) {
    if (!this.softDelete) throw new Error('softDelete is not enabled on this repository');
    const doc = await this.model.findOneAndUpdate(
      { _id: id },
      { $set: { [this.deletedField]: null } },
      { new: true, ...this.#sessionOpt(options) },
    );
    return this.toDomain(doc);
  }

  async count(filter = {}, options = {}) {
    return this.model
      .countDocuments(this.#withSoftDelete(filter, options.includeDeleted))
      .session(options.session ?? null);
  }

  async exists(filter = {}, options = {}) {
    const doc = await this.model
      .exists(this.#withSoftDelete(filter, options.includeDeleted))
      .session(options.session ?? null);
    return Boolean(doc);
  }

  /** Run a raw aggregation pipeline. Use the Aggregation helpers to build it. */
  async aggregate(pipeline, options = {}) {
    return this.model.aggregate(pipeline).session(options.session ?? null);
  }

  /** Aggregation helper factory, exposed for subclasses. */
  get agg() {
    return Aggregation;
  }
}

export default BaseRepository;
