import { cacheService } from '#core/cache/cache.service.js';
import { cacheInvalidation } from '#core/cache/cache-invalidation.js';

/**
 * Service-layer caching facade with namespaced key building. Business services
 * pass a logical namespace so keys never collide across modules.
 *
 *   const cache = createCacheHelper('catalog');
 *   await cache.getOrSet(`product:${id}`, 300, () => repo.findById(id));
 */
export function createCacheHelper(namespace, deps = {}) {
  const cache = deps.cacheService ?? cacheService;
  const invalidation = deps.cacheInvalidation ?? cacheInvalidation;
  const key = (k) => `${namespace}:${k}`;

  return {
    get: (k) => cache.get(key(k)),
    set: (k, value, ttl) => cache.set(key(k), value, ttl),
    del: (k) => cache.del(key(k)),
    getOrSet: (k, ttl, factory) => cache.getOrSet(key(k), ttl, factory),
    invalidate: (k) => invalidation.invalidateKey(key(k)),
    invalidateNamespace: () => invalidation.invalidateByPattern(`${namespace}:*`),
  };
}

export default createCacheHelper;
