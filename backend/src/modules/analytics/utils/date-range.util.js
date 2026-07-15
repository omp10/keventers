import { BadRequestError } from '#core/errors/app-error.js';

import { ANALYTICS_ERRORS, PERIOD } from '../constants/analytics.constants.js';

/**
 * Parse a dashboard date-range query into a normalized { from, to, period }.
 * Defaults to the last 30 days at DAY granularity. `from`/`to` are ISO dates.
 */
export function parseRange({ from, to, period } = {}) {
  const now = new Date();
  const end = to ? new Date(to) : now;
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86400000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestError(ANALYTICS_ERRORS.INVALID_RANGE);
  if (start > end) throw new BadRequestError(ANALYTICS_ERRORS.INVALID_RANGE);
  const p = period && Object.values(PERIOD).includes(period) ? period : PERIOD.DAY;
  return { from: start, to: end, period: p };
}

/** Start-of-day (UTC) for "today" KPIs. */
export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
