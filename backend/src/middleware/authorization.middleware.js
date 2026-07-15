/**
 * Re-export of the authorization platform guards. Kept as a stable import path;
 * the real RBAC/policy enforcement lives in the auth platform (Phase 3).
 */
export {
  requirePermission,
  requireAnyPermission,
  requireRole,
} from '#platform/auth/index.js';
export { requirePermission as default } from '#platform/auth/index.js';
