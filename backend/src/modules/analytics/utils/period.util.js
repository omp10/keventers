import { PERIOD } from '../constants/analytics.constants.js';

/**
 * Time-bucket key math (UTC, deterministic). Every event stamps ONE key per
 * maintained granularity so dashboards read a compact set of pre-aggregated
 * projection docs over an indexed (period, periodKey) range — never scanning the
 * transaction history. Keys are lexicographically sortable within a period.
 */
const pad = (n, w = 2) => String(n).padStart(w, '0');

/** ISO-8601 week number + week-year for a date. */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** All bucket keys for a moment: { hour, day, week, month, year, all }. */
export function periodKeys(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hr = pad(d.getUTCHours());
  const { year: wy, week } = isoWeek(d);
  return {
    [PERIOD.HOUR]: `${y}-${mo}-${day}T${hr}`,
    [PERIOD.DAY]: `${y}-${mo}-${day}`,
    [PERIOD.WEEK]: `${wy}-W${pad(week)}`,
    [PERIOD.MONTH]: `${y}-${mo}`,
    [PERIOD.YEAR]: `${y}`,
    [PERIOD.ALL]: 'all',
  };
}

/** Extra dimensions for peak analysis (hour-of-day 0..23, day-of-week 0=Sun). */
export function timeDimensions(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return { hourOfDay: d.getUTCHours(), dayOfWeek: d.getUTCDay() };
}

/**
 * The list of `day` periodKeys spanning [from, to] inclusive — used to read a
 * range as a set of daily buckets (fast, indexed) instead of scanning orders.
 */
export function dayKeysInRange(from, to) {
  const keys = [];
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    keys.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
  }
  return keys;
}

/** Pick the coarsest single-period key covering exactly [from,to] if possible. */
export function bestPeriodForRange(period) {
  return Object.values(PERIOD).includes(period) ? period : PERIOD.DAY;
}
