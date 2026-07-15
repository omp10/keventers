/**
 * Re-export of the authentication platform middleware. Kept as a stable import
 * path for the global pipeline; the real implementation lives in the auth
 * platform (Phase 3).
 */
export { authenticate, requireAuth } from '#platform/auth/index.js';
export { authenticate as default } from '#platform/auth/index.js';
