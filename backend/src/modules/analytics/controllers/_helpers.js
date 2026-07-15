import { parseRange } from '../utils/date-range.util.js';

export const actor = (req) => req.principal?.id ?? null;
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? req.body?.restaurantId ?? undefined;
export const organizationIdOf = (req) => req.validatedQuery?.organizationId ?? req.query?.organizationId ?? undefined;
export const rangeOf = (req) => parseRange(req.validatedQuery ?? req.query ?? {});
