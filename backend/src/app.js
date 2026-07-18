import path from 'node:path';

import express from 'express';

import { config } from '#config';
import { setupSwagger } from '#core/swagger/swagger.js';
import { applyGlobalMiddleware } from '#middleware/index.js';
import { errorHandlerMiddleware } from '#middleware/error-handler.middleware.js';
import { notFoundMiddleware } from '#middleware/not-found.middleware.js';
import routes from '#routes/index.js';

import v1Router from '#api/v1/router.js';

/**
 * Build and return the configured Express application.
 *
 * Assembly order:
 *   global middleware → API docs → static uploads → routers → 404 → global
 *   error handler. The error handler is intentionally the LAST thing registered.
 *
 * @returns {import('express').Application}
 */
export function createApp() {
  const app = express();

  applyGlobalMiddleware(app);
  setupSwagger(app);

  // Uploaded media (local storage driver). The Storage Platform writes files
  // under `storage.local.dir` and hands back `${publicBaseUrl}/<key>` URLs —
  // this is what actually serves them. In production the same paths are fronted
  // by nginx from the upload volume (e.g. /var/www/uploads), so the URL shape
  // stays identical and only the driver/base URL change.
  if (config.storage.driver === 'local') {
    app.use(
      '/static',
      express.static(path.resolve(config.storage.local.dir), {
        maxAge: '30d',
        fallthrough: true,
        index: false,
        setHeaders: (res) => {
          // Uploads are user-supplied: never let the browser sniff them into
          // something executable.
          res.setHeader('X-Content-Type-Options', 'nosniff');
          // The frontend runs on a DIFFERENT origin (5173 in dev, the app
          // domain in prod) than this API. Without these, a cross-origin
          // `<img src>` to a stored upload fails to load (fetch still 200s) —
          // which is exactly the "broken image preview" on every banner /
          // product / category image. CDNs send these; so must we.
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
        },
      }),
    );
  }

  // Operational routes (health/ready/metrics) at the root.
  app.use(routes);

  // Versioned business API — modules mounted under /api/v1/<module>.
  app.use(`${config.server.apiPrefix}/v1`, v1Router);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}

export default createApp;
