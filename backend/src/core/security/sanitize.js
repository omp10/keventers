import validator from 'validator';

/**
 * Input sanitization helpers. Defense-in-depth alongside schema validation —
 * neutralizes stored-XSS vectors and normalizes common fields. Reusable and
 * business-agnostic.
 */
export const Sanitize = {
  /** Trim + strip angle-bracket tags + escape HTML entities. */
  text(input) {
    if (typeof input !== 'string') return input;
    return validator.escape(validator.stripLow(input.trim()));
  },

  /** Remove all HTML tags without escaping (for plain-text extraction). */
  stripTags(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/<\/?[^>]+(>|$)/g, '').trim();
  },

  normalizeEmail(input) {
    if (typeof input !== 'string') return input;
    return validator.normalizeEmail(input.trim()) || input.trim().toLowerCase();
  },

  /** Deep-sanitize all string values of a plain object (non-mutating). */
  object(obj, sanitizer = Sanitize.text) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((v) => Sanitize.object(v, sanitizer));
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        typeof v === 'string' ? sanitizer(v) : Sanitize.object(v, sanitizer),
      ]),
    );
  },
};

export default Sanitize;
