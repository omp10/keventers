import { MockRepository } from '#testing/index.js';

export class FakeApplicationRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  findByEmail(email) {
    return this.findOne({ email: String(email).toLowerCase() });
  }
  existsByEmail(email) {
    return this.exists({ email: String(email).toLowerCase() });
  }
}

export class FakeOrganizationRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  existsBySlug(slug) {
    return this.exists({ slug: String(slug).toLowerCase() });
  }
  findBySlug(slug) {
    return this.findOne({ slug: String(slug).toLowerCase() });
  }
}

export class FakeRestaurantRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  existsBySlugInOrg(organizationId, slug) {
    return this.exists({ organizationId, slug: String(slug).toLowerCase() });
  }
}

export class FakeBranchRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
}

export class FakeMembershipRepository extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  findActiveByUser(userId) {
    return this.find({ userId, status: 'active' });
  }
}

/** Identity UserService double backed by an in-memory map. */
export function createFakeUserService() {
  const byEmail = new Map();
  let seq = 0;
  return {
    created: [],
    resets: [],
    async getUserByEmail(email) {
      return byEmail.get(String(email).toLowerCase()) ?? null;
    },
    async createUser(data) {
      seq += 1;
      const user = {
        id: `user-${seq}`,
        email: data.email.toLowerCase(),
        roles: data.roles ?? [],
        type: data.type,
      };
      byEmail.set(user.email, user);
      this.created.push(user);
      return user;
    },
    async assignRoles(id, roles) {
      for (const u of byEmail.values()) if (u.id === id) u.roles = [...new Set([...u.roles, ...roles])];
      return [...byEmail.values()].find((u) => u.id === id);
    },
    async deleteUser(id) {
      for (const [k, u] of byEmail) if (u.id === id) byEmail.delete(k);
      return { id, deleted: true };
    },
    async requestPasswordReset(email) {
      this.resets.push(email);
      return { requested: true };
    },
  };
}

export const fakeStorage = {
  uploads: [],
  async upload({ filename, folder }) {
    const key = `${folder}/${filename}-${fakeStorage.uploads.length}`;
    fakeStorage.uploads.push(key);
    return { key, url: `https://cdn.test/${key}`, size: 1 };
  },
};

export function createFakeNotifications() {
  return { sent: [], async send(channel, message) { this.sent.push({ channel, message }); return { success: true }; } };
}

export function createFakeEventBus() {
  return { published: [], async publish(e) { this.published.push(e); }, subscribe() {} };
}

export const fakeSubscriptions = {
  buildTrialSubscription: () => ({ plan: 'trial', status: 'trial' }),
};
