/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildSwaggerConfig(env) {
  return {
    enabled: env.SWAGGER_ENABLED,
    route: env.SWAGGER_ROUTE,
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Keventers Smart Ordering Platform API',
        version: '1.0.0',
        description:
          'Keventers backend API. Documents operational (health/readiness) endpoints and the Identity module (auth, users, roles, permissions, staff).',
      },
      servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      tags: [{ name: 'System', description: 'Operational health & readiness probes' }],
    },
    // Operational routes + business module routes are scanned for OpenAPI JSDoc.
    apis: ['./src/routes/*.routes.js', './src/modules/**/routes/*.routes.js'],
  };
}
