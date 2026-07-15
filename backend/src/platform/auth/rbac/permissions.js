/**
 * Permission abstraction. A permission is a `resource:action` string
 * (e.g. "catalog:read", "order:write"). Business modules REGISTER their own
 * permissions here at boot; the platform ships none.
 */
export class PermissionRegistry {
  /** @type {Set<string>} */
  #permissions = new Set();

  /** @param {string} resource @param {string} action */
  static of(resource, action) {
    return `${resource}:${action}`;
  }

  register(permission) {
    this.#permissions.add(permission);
    return this;
  }

  registerMany(permissions = []) {
    permissions.forEach((p) => this.#permissions.add(p));
    return this;
  }

  has(permission) {
    return this.#permissions.has(permission);
  }

  list() {
    return [...this.#permissions];
  }
}

export const permissionRegistry = new PermissionRegistry();
export default permissionRegistry;
