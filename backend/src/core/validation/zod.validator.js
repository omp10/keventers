import { ValidationError } from '#core/errors/app-error.js';

/**
 * Validate a value against a Zod schema, throwing a typed ValidationError with
 * structured field details on failure. Reusable everywhere (services, jobs,
 * event handlers) — not just HTTP.
 *
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} value
 * @returns {T} The parsed, coerced, stripped value.
 */
export function validateWith(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}

/** Non-throwing variant returning { success, data | error }. */
export function safeValidateWith(schema, value) {
  return schema.safeParse(value);
}
