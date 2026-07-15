import { validateWith } from './zod.validator.js';

/**
 * Boundary-validation middleware factory. Validates and REPLACES the chosen
 * request segments with their parsed/coerced/stripped values, so controllers
 * receive clean, typed input.
 *
 * This is generic platform infrastructure. Business modules supply their own
 * Zod schemas in later phases; none are defined here.
 *
 * @param {{ body?: import('zod').ZodSchema, params?: import('zod').ZodSchema, query?: import('zod').ZodSchema }} schemas
 * @returns {import('express').RequestHandler}
 */
export function validate(schemas = {}) {
  return function validationMiddleware(req, _res, next) {
    try {
      if (schemas.params) req.params = validateWith(schemas.params, req.params);
      if (schemas.query) req.validatedQuery = validateWith(schemas.query, req.query);
      if (schemas.body) req.body = validateWith(schemas.body, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validate;
