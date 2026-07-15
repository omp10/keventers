import { WILDCARD_PERMISSION } from '../constants/auth.constants.js';

import { roleRegistry } from './roles.js';

/**
 * Policy evaluator: decides whether a principal may perform an action. Combines
 * permissions granted directly on the principal with those resolved from its
 * roles (via the role registry, honoring inheritance and the wildcard).
 *
 * Supports segment wildcards: a granted `catalog:*` satisfies `catalog:read`.
 */
export class PolicyEvaluator {
  constructor(registry = roleRegistry) {
    this.roleRegistry = registry;
  }

  /** Resolve every effective permission for a principal. */
  effectivePermissions(principal) {
    const set = new Set(principal?.permissions ?? []);
    for (const p of this.roleRegistry.permissionsForRoles(principal?.roles ?? [])) set.add(p);
    return set;
  }

  #matches(granted, required) {
    if (granted === WILDCARD_PERMISSION || granted === required) return true;
    // Segment wildcard, e.g. "catalog:*" matches "catalog:read".
    const [gRes, gAct] = granted.split(':');
    const [rRes, rAct] = required.split(':');
    return gRes === rRes && gAct === '*';
  }

  can(principal, requiredPermission) {
    if (!principal?.authenticated) return false;
    const effective = this.effectivePermissions(principal);
    for (const granted of effective) {
      if (this.#matches(granted, requiredPermission)) return true;
    }
    return false;
  }

  canAny(principal, permissions = []) {
    return permissions.some((p) => this.can(principal, p));
  }

  canAll(principal, permissions = []) {
    return permissions.every((p) => this.can(principal, p));
  }

  hasRole(principal, roles = []) {
    return (principal?.roles ?? []).some((r) => roles.includes(r));
  }
}

export const policyEvaluator = new PolicyEvaluator();
export default policyEvaluator;
