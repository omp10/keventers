import { validateWith, safeValidateWith } from '#core/validation/zod.validator.js';

/**
 * Thin service-layer facade over the Zod validator so business services can
 * enforce input/invariant schemas without importing validation internals.
 */
export const ValidationHelper = {
  validate: validateWith,
  safeValidate: safeValidateWith,

  /**
   * Assert a business invariant, throwing a ValidationError-style failure.
   * @param {boolean} condition
   * @param {string} message
   * @param {Array} [details]
   */
  assert(condition, message, details = []) {
    if (!condition) {
      // Local import avoids a cycle at module top-level.
      const err = new Error(message);
      err.name = 'ValidationError';
      err.details = details;
      throw err;
    }
  },
};

export default ValidationHelper;
