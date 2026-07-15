/**
 * Lightweight dependency-injection container / service registry.
 *
 * Supports:
 *  - value registration:   register(token, instance)
 *  - lazy singletons:      registerSingleton(token, factory)  // factory(container) once
 *  - factories:            registerFactory(token, factory)    // factory(container) each resolve
 *
 * The composition root (server.js) is the only place that wires concrete
 * implementations. Everything else depends on tokens, never on `new`.
 */
export class Container {
  #registrations = new Map();
  #singletons = new Map();

  register(token, value) {
    this.#registrations.set(token, { type: 'value', value });
    return this;
  }

  registerSingleton(token, factory) {
    this.#registrations.set(token, { type: 'singleton', factory });
    return this;
  }

  registerFactory(token, factory) {
    this.#registrations.set(token, { type: 'factory', factory });
    return this;
  }

  has(token) {
    return this.#registrations.has(token);
  }

  resolve(token) {
    const reg = this.#registrations.get(token);
    if (!reg) {
      throw new Error(`No provider registered for token: ${String(token)}`);
    }

    switch (reg.type) {
      case 'value':
        return reg.value;
      case 'factory':
        return reg.factory(this);
      case 'singleton': {
        if (!this.#singletons.has(token)) {
          this.#singletons.set(token, reg.factory(this));
        }
        return this.#singletons.get(token);
      }
      default:
        throw new Error(`Unknown registration type for token: ${String(token)}`);
    }
  }

  reset() {
    this.#registrations.clear();
    this.#singletons.clear();
  }
}

/** Shared application container instance. */
export const container = new Container();

export default container;
