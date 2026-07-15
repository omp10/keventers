/**
 * TTL constants & helpers (in seconds) shared by cache/session/lock services.
 */
export const TTL = Object.freeze({
  SECOND: 1,
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,
  WEEK: 60 * 60 * 24 * 7,
});

export const seconds = (n) => n;
export const minutes = (n) => n * TTL.MINUTE;
export const hours = (n) => n * TTL.HOUR;
export const days = (n) => n * TTL.DAY;

/** Add jitter (±pct) to a TTL to avoid synchronized cache-stampede expiry. */
export function withJitter(ttlSeconds, pct = 0.1) {
  const delta = Math.floor(ttlSeconds * pct);
  const offset = Math.floor((Math.sin(ttlSeconds) + 1) * delta); // deterministic, no Math.random
  return ttlSeconds - delta + offset;
}
