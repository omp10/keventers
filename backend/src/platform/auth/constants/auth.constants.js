/**
 * Authentication/authorization constants. Business-agnostic — no user domain.
 */
export const TOKEN_TYPE = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
});

export const AUTH_HEADER = 'authorization';
export const BEARER_PREFIX = 'Bearer ';

/** Principal attached to req by the authentication middleware. */
export const ANONYMOUS_PRINCIPAL = Object.freeze({
  id: null,
  roles: [],
  permissions: [],
  authenticated: false,
});

/**
 * Baseline platform roles. Modules may extend the role registry; these are
 * generic tiers, NOT business personas.
 */
export const SYSTEM_ROLE = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SERVICE: 'service',
  USER: 'user',
  GUEST: 'guest',
});

/** Wildcard that grants every permission (assigned to super_admin). */
export const WILDCARD_PERMISSION = '*';
