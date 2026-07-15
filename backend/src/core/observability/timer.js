import { performance } from 'node:perf_hooks';

/**
 * High-resolution performance timers.
 *
 *   const end = startTimer();
 *   ...work...
 *   const ms = end();  // elapsed milliseconds (float)
 */
export function startTimer() {
  const start = performance.now();
  return () => performance.now() - start;
}

/**
 * Time an async function, returning both its result and the elapsed ms.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ result: T, durationMs: number }>}
 */
export async function timed(fn) {
  const end = startTimer();
  const result = await fn();
  return { result, durationMs: end() };
}
