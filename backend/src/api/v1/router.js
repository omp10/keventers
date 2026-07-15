import { Router } from 'express';

import { modules } from '#modules/index.js';

/**
 * API v1 aggregator. Mounts every registered module's router under its base
 * path, e.g. Identity → /api/v1/identity. Versioning is URI-based per the
 * Phase 1 architecture.
 */
const router = Router();

for (const module of modules) {
  router.use(module.basePath, module.router);
}

export default router;
