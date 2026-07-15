/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildLoggerConfig(env) {
  return {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
    // Keys scrubbed from every log record to avoid leaking secrets / PII.
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
      '*.authorization',
    ],
  };
}
