import { logger } from '#core/logging/logger.js';

/**
 * Socket event registry. Modules register `(socket, io) => void` connection
 * initializers per namespace; each wires that socket's `on(...)` handlers. This
 * keeps socket event wiring modular and discoverable — no business events here.
 */
export class SocketEventRegistry {
  /** @type {Map<string, Array<(socket: import('socket.io').Socket, nsp: object) => void>>} */
  #initializers = new Map();

  /**
   * @param {string} namespace  e.g. '/' or '/notifications'
   * @param {(socket: import('socket.io').Socket, nsp: object) => void} initializer
   */
  onConnection(namespace, initializer) {
    const list = this.#initializers.get(namespace) ?? [];
    list.push(initializer);
    this.#initializers.set(namespace, list);
    return this;
  }

  getInitializers(namespace) {
    return this.#initializers.get(namespace) ?? [];
  }

  /** Apply all registered initializers to a newly connected socket. */
  applyTo(namespace, socket, nsp) {
    for (const init of this.getInitializers(namespace)) {
      try {
        init(socket, nsp);
      } catch (err) {
        logger().error({ err, namespace }, 'Socket connection initializer failed');
      }
    }
  }
}

export const socketEventRegistry = new SocketEventRegistry();
export default socketEventRegistry;
