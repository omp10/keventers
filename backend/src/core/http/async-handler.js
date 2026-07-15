/**
 * Wrap an async route/controller handler so any thrown error or rejected
 * promise is forwarded to Express's error pipeline via next(err).
 * Removes repetitive try/catch from controllers.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} handler
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export default asyncHandler;
