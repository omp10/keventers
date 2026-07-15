import { MockRepository } from '#testing/index.js';
import { buildTenantContext } from '#modules/organization/index.js';

/**
 * In-memory branch-scoped repository double mirroring BranchScopedRepository on
 * top of the platform MockRepository, so QR services can be unit-tested without
 * MongoDB / Redis / the organization module.
 */
export class FakeScopedRepo extends MockRepository {
  constructor({ softDelete = true } = {}) {
    super({ softDelete });
  }

  scoped(scope, filter = {}) {
    const base = { ...filter, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    if (scope.branchId) base.branchId = scope.branchId;
    return base;
  }

  createScoped(scope, data) {
    const stamped = { ...data, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    if (scope.branchId) stamped.branchId = scope.branchId;
    return this.create(stamped);
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
}

export class FakeTableRepo extends FakeScopedRepo {
  existsByNumber(scope, number) {
    return this.existsScoped(scope, { number: String(number) });
  }
  countByGroup(scope, groupId) {
    return this.countScoped(scope, { groupId });
  }
}

export class FakeGroupRepo extends FakeScopedRepo {
  existsByName(scope, name) {
    return this.existsScoped(scope, { name: String(name) });
  }
}

export class FakeQrRepo extends FakeScopedRepo {
  findByToken(token) {
    return this.findOne({ token });
  }
  findByTable(scope, tableId) {
    return this.findScoped(scope, { tableId });
  }
  findActiveByTable(scope, tableId) {
    return this.findOneScoped(scope, { tableId, status: 'active' });
  }
  async deactivateForTable(scope, tableId) {
    const rows = await this.findScoped(scope, { tableId, status: 'active' });
    for (const r of rows) await this.updateById(r._id ?? r.id, { status: 'inactive' });
    return { modifiedCount: rows.length };
  }
  recordScan() {
    return Promise.resolve();
  }
}

export class FakeSessionRepo extends MockRepository {
  constructor() {
    super({ softDelete: false });
  }
  scoped(scope, filter = {}) {
    const base = { ...filter, organizationId: scope.organizationId, restaurantId: scope.restaurantId };
    if (scope.branchId) base.branchId = scope.branchId;
    return base;
  }
  paginateScoped(scope, params = {}) {
    return this.paginate({ ...params, filter: this.scoped(scope, params.filter ?? {}) });
  }
  findBySessionId(sessionId) {
    return this.findOne({ sessionId });
  }
  findByRecoveryCode(recoveryCode) {
    return this.findOne({ recoveryCode });
  }
  async updateBySessionId(sessionId, patch) {
    const s = await this.findOne({ sessionId });
    if (!s) return null;
    return this.updateById(s._id ?? s.id, patch);
  }
  findLiveByTable(tableId, statuses) {
    return this.find({ tableId, status: { $in: statuses } });
  }
  countLiveByTable(tableId, statuses) {
    return this.count({ tableId, status: { $in: statuses } });
  }
}

/** In-memory guest-session Redis store double. */
export function createFakeSessionStore() {
  const map = new Map();
  return {
    map,
    async save(id, snap) {
      map.set(id, { ...snap });
    },
    async get(id) {
      return map.has(id) ? { ...map.get(id) } : null;
    },
    async touch() {
      return 1;
    },
    async exists(id) {
      return map.has(id);
    },
    async destroy(id) {
      return map.delete(id) ? 1 : 0;
    },
  };
}

/** Records occupancy calls without Redis. */
export function createFakeOccupancy() {
  return {
    occupied: [],
    released: [],
    async occupy(args) {
      this.occupied.push(args);
      return { occupied: true, sessions: 1 };
    },
    async release(args) {
      this.released.push(args);
      return { released: true, sessions: 0 };
    },
    async forceRelease(args) {
      this.released.push({ ...args, force: true });
      return { released: true, sessions: 0 };
    },
    async getLiveCount() {
      return 0;
    },
  };
}

export function createFakeQrCache() {
  const map = new Map();
  return {
    map,
    async get(t) {
      return map.has(t) ? { ...map.get(t) } : null;
    },
    async set(t, r) {
      map.set(t, { ...r });
    },
    async del(t) {
      return map.delete(t) ? 1 : 0;
    },
  };
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
    names() {
      return this.published.map((e) => e.name);
    },
  };
}

export function fakeScopeResolver(scope = { organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' }) {
  return async () => ({ ...scope, restaurant: { _id: scope.restaurantId }, branch: { _id: scope.branchId } });
}

export function buildTenant({ organizationId = 'org1', restaurantId = 'rest1', role = 'organization_admin' } = {}) {
  return buildTenantContext({
    principal: { id: 'user-1', roles: [role] },
    memberships: [{ organizationId, restaurantId, isOwner: true }],
  });
}

export const SCOPE = { organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' };
