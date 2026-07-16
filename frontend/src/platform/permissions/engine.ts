/**
 * PERMISSION ENGINE — pure, framework-free authorization matching that mirrors
 * the backend RBAC (wildcards: `*`, `resource:*`). Everything downstream (guards,
 * navigation visibility, action gating) uses these predicates, so authorization
 * is centralized and configuration-driven — never `if (role === 'admin')` inline.
 */

/** Does a single granted permission satisfy a required one? */
export function matchPermission(granted: string, required: string): boolean {
  if (granted === '*' || granted === required) return true;
  if (granted.endsWith(':*')) return required.startsWith(granted.slice(0, -1)); // resource:* ⊇ resource:action
  return false;
}

export function hasPermission(granted: string[] | undefined, required: string): boolean {
  return (granted ?? []).some((g) => matchPermission(g, required));
}
export function hasAnyPermission(granted: string[] | undefined, required: string[]): boolean {
  return required.some((r) => hasPermission(granted, r));
}
export function hasAllPermissions(granted: string[] | undefined, required: string[]): boolean {
  return required.every((r) => hasPermission(granted, r));
}

export function hasRole(roles: string[] | undefined, required: string): boolean {
  return (roles ?? []).includes(required);
}
export function hasAnyRole(roles: string[] | undefined, required: string[]): boolean {
  return required.some((r) => hasRole(roles, r));
}

/** A declarative access rule — attach to nav items, routes, actions, flags. */
export type AccessRule = {
  /** Any of these permissions grants access. */
  anyPermission?: string[];
  /** All of these permissions are required. */
  allPermissions?: string[];
  /** Any of these roles grants access. */
  anyRole?: string[];
  /** Required feature flags (evaluated by the flag platform). */
  requireFlags?: string[];
  /** Escape hatch: fully custom predicate. */
  custom?: (ctx: AccessContext) => boolean;
};

export type AccessContext = {
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  flags: Record<string, boolean>;
};

/** Evaluate an AccessRule against the current context. Empty rule = allow. */
export function evaluateAccess(rule: AccessRule | undefined, ctx: AccessContext): boolean {
  if (!rule) return true;
  if (rule.anyRole && !hasAnyRole(ctx.roles, rule.anyRole)) return false;
  if (rule.anyPermission && !hasAnyPermission(ctx.permissions, rule.anyPermission)) return false;
  if (rule.allPermissions && !hasAllPermissions(ctx.permissions, rule.allPermissions)) return false;
  if (rule.requireFlags && !rule.requireFlags.every((f) => ctx.flags[f])) return false;
  if (rule.custom && !rule.custom(ctx)) return false;
  return true;
}
