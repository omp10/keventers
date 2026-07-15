import { MockRepository } from '#testing/index.js';

/** User repo double with identity-specific query methods. */
export class FakeUserRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  findByEmail(email) {
    return this.findOne({ email: String(email).toLowerCase() });
  }
  existsByEmail(email) {
    return this.exists({ email: String(email).toLowerCase() });
  }
  existsByPhone(phone) {
    return this.exists({ phone });
  }
  // MockRepository stores the whole doc incl. passwordHash → serves auth reads.
  findByEmailForAuth(email) {
    return this.findOne({ email: String(email).toLowerCase() });
  }
}

class NamedRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  findByName(name) {
    return this.findOne({ name: String(name).toLowerCase() });
  }
  findByNames(names = []) {
    return this.find({ name: { $in: names.map((n) => String(n).toLowerCase()) } });
  }
  existsByName(name) {
    return this.exists({ name: String(name).toLowerCase() });
  }
}

export class FakeRoleRepository extends NamedRepository {}
export class FakePermissionRepository extends NamedRepository {}

/** Deterministic password service double (no bcrypt needed in unit tests). */
export const fakePasswords = {
  hash: async (plain) => `hashed:${plain}`,
  compare: async (plain, hash) => hash === `hashed:${plain}`,
  needsRehash: () => false,
};

/** Session service double capturing calls. */
export function createFakeSessions() {
  const calls = { revokeAll: [], revoke: [], created: [] };
  return {
    calls,
    createSession: async (identity) => {
      calls.created.push(identity);
      return { sessionId: 'sess-1', accessToken: 'access', refreshToken: 'refresh' };
    },
    refresh: async () => ({ sessionId: 'sess-1', accessToken: 'access2', refreshToken: 'refresh2' }),
    revoke: async (sid, uid) => calls.revoke.push({ sid, uid }),
    revokeAll: async (uid) => calls.revokeAll.push(uid),
  };
}

/** No-op event bus double. */
export function createFakeEventBus() {
  const published = [];
  return { published, publish: async (event) => published.push(event), subscribe() {} };
}
