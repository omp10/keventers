import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context propagated automatically through async call chains.
 * Holds identifiers (requestId, correlationId, and later userId/tenantId) so
 * any layer — service, repository, event handler — can enrich logs without
 * threading these values through every function signature.
 *
 * @typedef {{ requestId?: string, correlationId?: string, [key: string]: unknown }} RequestContext
 */
const storage = new AsyncLocalStorage();

/**
 * Run `callback` inside a fresh context store.
 * @param {RequestContext} context
 * @param {() => unknown} callback
 */
export function runWithContext(context, callback) {
  return storage.run({ ...context }, callback);
}

/** @returns {RequestContext} The current store, or an empty object outside a request. */
export function getContext() {
  return storage.getStore() ?? {};
}

/** Merge a value into the active context store (no-op outside a request). */
export function setContext(key, value) {
  const store = storage.getStore();
  if (store) store[key] = value;
}

export const requestContext = storage;
