/**
 * Minimal Result helper for flows that prefer explicit success/failure values
 * over throwing (e.g. inside retryable or batch operations). Optional — most
 * of the platform throws typed AppErrors instead.
 *
 * @template T, E
 */
export const Result = {
  ok(value) {
    return { ok: true, value };
  },
  fail(error) {
    return { ok: false, error };
  },
  isOk(result) {
    return result?.ok === true;
  },
  isFail(result) {
    return result?.ok === false;
  },
};

export default Result;
