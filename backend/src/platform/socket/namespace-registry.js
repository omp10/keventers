/**
 * Namespace registry. Modules declare Socket.IO namespaces (path + optional
 * per-namespace auth requirement); the socket server materializes them at boot.
 * The root namespace '/' is always available. No business namespaces here.
 */
export class NamespaceRegistry {
  /** @type {Map<string, { path: string, requireAuth: boolean }>} */
  #namespaces = new Map([['/', { path: '/', requireAuth: true }]]);

  /**
   * @param {string} path e.g. '/notifications'
   * @param {object} [options]
   * @param {boolean} [options.requireAuth]
   */
  register(path, { requireAuth = true } = {}) {
    this.#namespaces.set(path, { path, requireAuth });
    return this;
  }

  list() {
    return [...this.#namespaces.values()];
  }
}

export const namespaceRegistry = new NamespaceRegistry();
export default namespaceRegistry;
