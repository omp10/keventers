import { MockRepository } from '#testing/index.js';
import { buildTenantContext } from '#modules/organization/index.js';

/**
 * In-memory catalog repository double implementing the tenant-scoped surface of
 * CatalogScopedRepository (createScoped/findScoped/paginateScoped/…) on top of
 * the platform MockRepository. Lets catalog services be unit-tested without
 * MongoDB or the organization module.
 */
export class FakeScopedRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }

  scoped(scope, filter = {}) {
    return { ...filter, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
  }

  createScoped(scope, data) {
    return this.create({ ...data, organizationId: scope.organizationId, restaurantId: scope.restaurantId });
  }

  findScoped(scope, filter = {}) {
    return this.find(this.scoped(scope, filter));
  }

  findOneScoped(scope, filter = {}) {
    return this.findOne(this.scoped(scope, filter));
  }

  findByIdScoped(scope, id) {
    return this.findOne(this.scoped(scope, { _id: id }));
  }

  paginateScoped(scope, params = {}) {
    return this.paginate({ ...params, filter: this.scoped(scope, params.filter ?? {}) });
  }

  countScoped(scope, filter = {}) {
    return this.count(this.scoped(scope, filter));
  }

  existsScoped(scope, filter = {}) {
    return this.exists(this.scoped(scope, filter));
  }

  async updateManyScoped(scope, filter, patch) {
    const docs = await this.find(this.scoped(scope, filter));
    for (const d of docs) await this.updateById(d._id ?? d.id, patch);
    return { modifiedCount: docs.length };
  }
}

export class FakeMenuRepository extends FakeScopedRepository {
  existsBySlug(scope, slug) {
    return this.existsScoped(scope, { slug: String(slug).toLowerCase() });
  }
  clearDefaults(scope) {
    return this.updateManyScoped(scope, { isDefault: true }, { isDefault: false });
  }
}

export class FakeCategoryRepository extends FakeScopedRepository {
  existsBySlug(scope, slug) {
    return this.existsScoped(scope, { slug: String(slug).toLowerCase() });
  }
  findMainCategories(scope) {
    return this.findScoped(scope, { parentId: null });
  }
  findChildren(scope, parentId) {
    return this.findScoped(scope, { parentId });
  }
  countChildren(scope, parentId) {
    return this.countScoped(scope, { parentId });
  }
}

export class FakeProductRepository extends FakeScopedRepository {
  existsBySlug(scope, slug) {
    return this.existsScoped(scope, { slug: String(slug).toLowerCase() });
  }
  existsBySku(scope, sku) {
    if (!sku) return Promise.resolve(false);
    return this.existsScoped(scope, { sku: String(sku) });
  }
  countByCategory(scope, categoryId) {
    return this.countScoped(scope, { categoryId });
  }
  setHasVariants(scope, productId, hasVariants) {
    return this.updateManyScoped(scope, { _id: productId }, { hasVariants });
  }
}

export class FakeVariantRepository extends FakeScopedRepository {
  findByProduct(scope, productId) {
    return this.findScoped(scope, { productId });
  }
  countByProduct(scope, productId) {
    return this.countScoped(scope, { productId });
  }
  existsBySku(scope, sku) {
    if (!sku) return Promise.resolve(false);
    return this.existsScoped(scope, { sku: String(sku) });
  }
  clearDefaults(scope, productId) {
    return this.updateManyScoped(scope, { productId, isDefault: true }, { isDefault: false });
  }
}

export class FakeModifierGroupRepository extends FakeScopedRepository {}

export class FakeModifierRepository extends FakeScopedRepository {
  findByGroup(scope, groupId) {
    return this.findScoped(scope, { groupId });
  }
  countByGroup(scope, groupId) {
    return this.countScoped(scope, { groupId });
  }
  softDeleteByGroup(scope, groupId) {
    return this.updateManyScoped(scope, { groupId }, { deletedAt: new Date() });
  }
}

/** Fixed scope resolver double: always returns the same tenant scope. */
export function fakeScopeResolver(scope = { organizationId: 'org1', restaurantId: 'rest1' }) {
  return async () => ({ ...scope, restaurant: { _id: scope.restaurantId, organizationId: scope.organizationId } });
}

/** Build a real tenant context for a single-restaurant manager/admin. */
export function buildTenant({ organizationId = 'org1', restaurantId = 'rest1', role = 'organization_admin' } = {}) {
  return buildTenantContext({
    principal: { id: 'user-1', roles: [role] },
    memberships: [{ organizationId, restaurantId, isOwner: true }],
  });
}

export function createFakeEventBus() {
  return {
    published: [],
    async publish(e) {
      this.published.push(e);
    },
    async publishMany(events = []) {
      for (const e of events) this.published.push(e);
    },
    subscribe() {},
  };
}

export const fakeStorage = {
  uploads: [],
  deleted: [],
  async upload({ filename, folder }) {
    const key = `${folder}/${filename}-${fakeStorage.uploads.length}`;
    fakeStorage.uploads.push(key);
    return { key, url: `https://cdn.test/${key}`, size: 1 };
  },
  async delete(key) {
    fakeStorage.deleted.push(key);
    return true;
  },
};
