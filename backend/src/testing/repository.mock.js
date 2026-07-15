import { randomUUID } from 'node:crypto';

import { buildPageMeta, toPageRequest } from '#core/types/pagination.js';

/**
 * In-memory repository double implementing the BaseRepository surface. Lets
 * services be unit-tested without MongoDB. Supports the common query/soft-delete
 * operations; complex aggregations should be tested at the integration layer.
 *
 * @template T
 */
export class MockRepository {
  /** @param {object} [options] */
  constructor({ softDelete = false, deletedField = 'deletedAt', idField = '_id' } = {}) {
    /** @type {Map<string, T>} */
    this.docs = new Map();
    this.softDelete = softDelete;
    this.deletedField = deletedField;
    this.idField = idField;
  }

  #match(doc, filter) {
    return Object.entries(filter).every(([k, v]) => {
      if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(doc[k]);
      return doc[k] === v;
    });
  }

  #visible(doc) {
    return !this.softDelete || doc[this.deletedField] == null;
  }

  async create(data) {
    const id = data[this.idField] ?? randomUUID();
    const doc = { ...data, [this.idField]: id };
    this.docs.set(String(id), doc);
    return { ...doc };
  }

  async findById(id) {
    const doc = this.docs.get(String(id));
    return doc && this.#visible(doc) ? { ...doc } : null;
  }

  async findOne(filter = {}) {
    for (const doc of this.docs.values()) {
      if (this.#visible(doc) && this.#match(doc, filter)) return { ...doc };
    }
    return null;
  }

  async find(filter = {}) {
    return [...this.docs.values()]
      .filter((d) => this.#visible(d) && this.#match(d, filter))
      .map((d) => ({ ...d }));
  }

  async paginate({ filter = {}, pagination = {} } = {}) {
    const all = await this.find(filter);
    const pageRequest = toPageRequest(pagination);
    const items = all.slice(pageRequest.skip, pageRequest.skip + pageRequest.limit);
    return { items, meta: buildPageMeta(pageRequest, all.length) };
  }

  async updateById(id, patch) {
    const doc = this.docs.get(String(id));
    if (!doc || !this.#visible(doc)) return null;
    const updated = { ...doc, ...patch };
    this.docs.set(String(id), updated);
    return { ...updated };
  }

  async deleteById(id) {
    return this.docs.delete(String(id));
  }

  async softDeleteById(id) {
    return this.updateById(id, { [this.deletedField]: new Date() });
  }

  async count(filter = {}) {
    return (await this.find(filter)).length;
  }

  async exists(filter = {}) {
    return (await this.findOne(filter)) !== null;
  }

  /** Test convenience: reset all data. */
  clear() {
    this.docs.clear();
  }
}

export default MockRepository;
