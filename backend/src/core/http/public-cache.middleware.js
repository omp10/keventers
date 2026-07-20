/**
 * PUBLIC CACHE HEADERS — let the edge absorb a spike instead of Node.
 *
 * A QR rush means thousands of phones asking for the SAME branch menu within
 * seconds. Redis already removes the database work, but every one of those
 * requests still costs a Node process a JSON serialize + compress. Advertising
 * cacheability moves the repeats to nginx/CDN/browser, which serve them from
 * memory at orders of magnitude more throughput — turning "Node must survive
 * 10k requests" into "Node serves one request and nginx serves 9,999".
 *
 * `stale-while-revalidate` is what makes this safe under a spike: once the TTL
 * lapses the edge keeps serving the slightly-stale menu while ONE request
 * refreshes it, so an expiring cache can never stampede the origin.
 *
 * Only ever applied to anonymous public GETs — never to anything scoped to a
 * session, a customer or a tenant, which must not be stored by a shared cache.
 */
export function publicCache({ maxAge = 30, staleWhileRevalidate = 120 } = {}) {
  return function publicCacheMiddleware(req, res, next) {
    // HEAD is a GET without a body — caches (and health probes) rely on it
    // carrying the same freshness headers the GET would.
    const isRead = req.method === 'GET' || req.method === 'HEAD';
    // A request carrying credentials is per-user by definition: never cache it.
    if (!isRead || req.headers.authorization) {
      res.set('Cache-Control', 'no-store');
      return next();
    }
    res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
    // Responses are gzipped by content negotiation; without this a shared cache
    // can hand a compressed body to a client that never asked for one.
    res.vary('Accept-Encoding');
    return next();
  };
}

export default publicCache;
