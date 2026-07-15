import { SYSTEM_ROLE, WILDCARD_PERMISSION } from '../constants/auth.constants.js';

/**
 * Role abstraction: a named bundle of permissions, with optional inheritance.
 * Business modules register roles and attach permissions at boot. Only generic
 * platform tiers are pre-seeded (super_admin gets the wildcard).
 */
export class RoleRegistry {
  /** @type {Map<string, { permissions: Set<string>, inherits: string[] }>} */
  #roles = new Map();

  constructor() {
    this.define(SYSTEM_ROLE.SUPER_ADMIN, [WILDCARD_PERMISSION]);
    this.define(SYSTEM_ROLE.GUEST, []);
  }

  define(role, permissions = [], inherits = []) {
    this.#roles.set(role, { permissions: new Set(permissions), inherits });
    return this;
  }

  grant(role, permissions = []) {
    const entry = this.#roles.get(role) ?? { permissions: new Set(), inherits: [] };
    permissions.forEach((p) => entry.permissions.add(p));
    this.#roles.set(role, entry);
    return this;
  }

  /** Resolve the full (inheritance-expanded) permission set for a role. */
  permissionsFor(role, seen = new Set()) {
    if (seen.has(role)) return new Set();
    seen.add(role);
    const entry = this.#roles.get(role);
    if (!entry) return new Set();
    const result = new Set(entry.permissions);
    for (const parent of entry.inherits) {
      for (const p of this.permissionsFor(parent, seen)) result.add(p);
    }
    return result;
  }

  /** Union of resolved permissions across several roles. */
  permissionsForRoles(roles = []) {
    const set = new Set();
    for (const role of roles) {
      for (const p of this.permissionsFor(role)) set.add(p);
    }
    return set;
  }

  has(role) {
    return this.#roles.has(role);
  }

  list() {
    return [...this.#roles.keys()];
  }
}

export const roleRegistry = new RoleRegistry();
export default roleRegistry;
