/** Shared controller helpers. Tenant ids come from the validated/raw query and
 * are resolved + access-checked in the service — never trusted directly. */
export const actor = (req) => req.principal?.id ?? null;
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;
export const branchIdOf = (req) => req.validatedQuery?.branchId ?? req.query?.branchId ?? undefined;
