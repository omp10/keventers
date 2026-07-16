/**
 * Query-key factory. Consistent, hierarchical keys so invalidation is precise and
 * predictable. Business hooks build keys via `qk('orders', { status })` rather
 * than hand-writing arrays, preventing cache-collision bugs.
 */
export type QueryKeyParts = (string | number | boolean | null | undefined | Record<string, unknown>)[];

export function qk(scope: string, ...parts: QueryKeyParts) {
  return [scope, ...parts.filter((p) => p !== undefined)] as const;
}

/** Prefix key for broad invalidation, e.g. `qkScope('orders')` invalidates all order queries. */
export function qkScope(scope: string) {
  return [scope] as const;
}
