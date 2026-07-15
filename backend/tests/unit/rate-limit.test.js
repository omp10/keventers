import { describe, expect, it } from 'vitest';

import { RateLimitStore } from '#core/cache/rate-limit.store.js';

/**
 * Regression for the fixed-window limiter — INCR + EXPIRE must be a single atomic
 * script so a crash between them can never leave a key without a TTL (which would
 * rate-limit an identifier forever). We assert the store issues ONE eval call and
 * derives allowed/remaining from its result.
 */
function fakeRedis(state = {}) {
  return {
    evals: [],
    async eval(_script, _n, key, window) {
      this.evals.push({ key, window });
      state[key] = (state[key] ?? 0) + 1;
      return [state[key], Number(window)]; // [count, ttl] — script always returns a TTL
    },
  };
}

describe('RateLimitStore.hit — atomic', () => {
  it('increments and returns allowed/remaining via a single atomic eval', async () => {
    const client = fakeRedis();
    const store = new RateLimitStore(() => client);
    const first = await store.hit('ip:1.2.3.4:login', 300, 3);
    expect(first).toMatchObject({ allowed: true, count: 1, remaining: 2, resetSeconds: 300 });
    expect(client.evals).toHaveLength(1); // one atomic round-trip, no separate EXPIRE
  });

  it('blocks once the window count exceeds max', async () => {
    const client = fakeRedis();
    const store = new RateLimitStore(() => client);
    let last;
    for (let i = 0; i < 4; i += 1) last = await store.hit('ip:1.2.3.4:login', 300, 3);
    expect(last.allowed).toBe(false); // 4th hit over max=3
    expect(last.remaining).toBe(0);
  });
});
