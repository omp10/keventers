import { lazy, type ComponentType } from 'react';

/**
 * LAZY ROUTE — survives a deployment that happens mid-session.
 *
 * Every route is code-split, so navigating fetches a chunk whose filename
 * carries a content hash (`index-OotgCqfY.js`). Deploying rewrites those
 * hashes and removes the old files. Anyone with the app already open is still
 * holding the PREVIOUS index.html, so their next navigation asks for a chunk
 * that no longer exists and React throws:
 *
 *   TypeError: Failed to fetch dynamically imported module
 *
 * The user sees the error boundary for doing nothing wrong except being on the
 * site while we shipped. The fix is a hard reload — that fetches the new
 * index.html and, with it, the new chunk names.
 *
 * Guarded by a sessionStorage flag so a genuinely broken chunk (or an offline
 * device) cannot become an infinite reload loop: we retry ONCE per session,
 * then let the error boundary show. The flag clears on any successful load, so
 * a later deploy is still recoverable.
 */
const RELOAD_FLAG = 'kv-chunk-reloaded';

/** A missing chunk, as reported by browsers — they disagree on the wording. */
export function isMissingChunk(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error ?? '');
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Importing a module script failed') || // Safari
    message.includes('Unable to preload CSS')
  );
}

function reloadedAlready(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === '1';
  } catch {
    return false; // private mode: better to risk one reload than to never recover
  }
}

function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    /* ignore */
  }
}

function clearReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

/**
 * Drop-in replacement for `React.lazy` for route-level code splitting.
 * @param factory the same `() => import('...')` you would pass to `lazy`
 */
// Mirrors React.lazy's own signature — a route component's props are not this
// helper's business, and narrowing them rejects perfectly valid pages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRoute<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearReloadFlag(); // this session is healthy again
      return mod;
    } catch (error) {
      if (isMissingChunk(error) && !reloadedAlready()) {
        markReloaded();
        window.location.reload();
        // Never resolves — the reload replaces this document. Returning here
        // would briefly flash the error boundary before the page goes away.
        return await new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

export default lazyRoute;
