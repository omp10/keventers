/**
 * Minimal in-memory Redis double covering the commands used by the platform's
 * cache / session / rate-limit / lock services. For unit tests only — not a
 * full Redis implementation.
 */
export class MockRedis {
  constructor() {
    this.store = new Map();
    this.expires = new Map();
    this.status = 'ready';
  }

  #expired(key) {
    const exp = this.expires.get(key);
    if (exp !== undefined && exp <= Date.now()) {
      this.store.delete(key);
      this.expires.delete(key);
      return true;
    }
    return false;
  }

  async get(key) {
    if (this.#expired(key)) return null;
    const v = this.store.get(key);
    return v === undefined ? null : v;
  }

  async set(key, value, ...args) {
    const opts = args.map((a) => String(a).toUpperCase());
    if (opts.includes('NX') && this.store.has(key) && !this.#expired(key)) return null;
    this.store.set(key, value);
    const exIdx = opts.indexOf('EX');
    const pxIdx = opts.indexOf('PX');
    if (exIdx >= 0) this.expires.set(key, Date.now() + Number(args[exIdx + 1]) * 1000);
    else if (pxIdx >= 0) this.expires.set(key, Date.now() + Number(args[pxIdx + 1]));
    return 'OK';
  }

  async del(...keys) {
    let n = 0;
    for (const k of keys.flat()) {
      if (this.store.delete(k)) n += 1;
      this.expires.delete(k);
    }
    return n;
  }

  async exists(key) {
    return this.#expired(key) || !this.store.has(key) ? 0 : 1;
  }

  async incr(key) {
    const current = Number((await this.get(key)) ?? 0) + 1;
    this.store.set(key, String(current));
    return current;
  }

  async expire(key, seconds) {
    if (!this.store.has(key)) return 0;
    this.expires.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key) {
    if (!this.store.has(key)) return -2;
    const exp = this.expires.get(key);
    if (exp === undefined) return -1;
    return Math.max(Math.ceil((exp - Date.now()) / 1000), 0);
  }

  async sadd(key, ...members) {
    const set = this.store.get(key) instanceof Set ? this.store.get(key) : new Set();
    members.flat().forEach((m) => set.add(m));
    this.store.set(key, set);
    return members.length;
  }

  async srem(key, ...members) {
    const set = this.store.get(key);
    if (!(set instanceof Set)) return 0;
    let n = 0;
    members.flat().forEach((m) => (set.delete(m) ? (n += 1) : null));
    return n;
  }

  async smembers(key) {
    const set = this.store.get(key);
    return set instanceof Set ? [...set] : [];
  }

  async scan(cursor, _match, pattern, _count, _n) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    const keys = [...this.store.keys()].filter((k) => regex.test(k));
    return ['0', keys];
  }

  /** Compare-and-delete used by the distributed lock release script. */
  async eval(_script, _numKeys, key, token) {
    if (this.store.get(key) === token) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }

  multi() {
    return this.#chain();
  }

  pipeline() {
    return this.#chain();
  }

  #chain() {
    const ops = [];
    const self = this;
    const proxy = {
      incr(key) {
        ops.push(['incr', key]);
        return proxy;
      },
      ttl(key) {
        ops.push(['ttl', key]);
        return proxy;
      },
      set(...a) {
        ops.push(['set', ...a]);
        return proxy;
      },
      del(...a) {
        ops.push(['del', ...a]);
        return proxy;
      },
      sadd(...a) {
        ops.push(['sadd', ...a]);
        return proxy;
      },
      srem(...a) {
        ops.push(['srem', ...a]);
        return proxy;
      },
      expire(...a) {
        ops.push(['expire', ...a]);
        return proxy;
      },
      async exec() {
        const results = [];
        for (const [cmd, ...args] of ops) {
          results.push([null, await self[cmd](...args)]);
        }
        return results;
      },
    };
    return proxy;
  }

  duplicate() {
    return this;
  }

  async ping() {
    return 'PONG';
  }

  async connect() {
    this.status = 'ready';
  }

  async quit() {
    this.status = 'end';
  }
}

export default MockRedis;
