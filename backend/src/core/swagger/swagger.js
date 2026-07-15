import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from '#config';
import { logger } from '#core/logging/logger.js';

/**
 * Mount Swagger UI + the raw OpenAPI JSON. In this phase only the operational
 * (health/readiness) routes are documented; business APIs come later.
 *
 * @param {import('express').Application} app
 */
export function setupSwagger(app) {
  if (!config.swagger.enabled) {
    logger().info('Swagger disabled');
    return;
  }

  const spec = swaggerJSDoc({
    definition: config.swagger.definition,
    apis: config.swagger.apis,
  });

  const route = config.swagger.route;
  app.get(`${route}.json`, (_req, res) => res.json(spec));
  app.use(route, swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));

  logger().info({ route }, 'Swagger UI mounted');
}

export default setupSwagger;
