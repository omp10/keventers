/** Shared controller helpers for the QR module. Tenant ids come from the
 * validated query (or raw query for create bodies) — never from arbitrary body
 * fields — and are resolved/verified against the tenant context in the service. */
export const actor = (req) => req.principal?.id ?? null;

export const restaurantIdOf = (req) =>
  req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;

export const branchIdOf = (req) =>
  req.validatedQuery?.branchId ?? req.query?.branchId ?? undefined;
