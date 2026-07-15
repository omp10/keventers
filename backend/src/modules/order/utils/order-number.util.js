import { DEFAULT_ORDER_PREFIX, ORDER_TYPE_CODE } from '../constants/order.constants.js';

/**
 * Enterprise order-number formatting. Produces a human-facing, unique, sortable
 * number like `KEV-DIN-20260715-000123` — NEVER a Mongo ObjectId. The daily
 * sequence is supplied by an atomic counter (see OrderNumberService); this util
 * only shapes the parts. Format is configurable via the restaurant prefix.
 */

/** Derive the restaurant prefix (configured, or from the slug, or default). */
export function resolvePrefix(restaurant) {
  const configured = restaurant?.settings?.orderNumberPrefix;
  const base = configured || restaurant?.slug || DEFAULT_ORDER_PREFIX;
  return String(base).replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || DEFAULT_ORDER_PREFIX;
}

/** YYYYMMDD in the restaurant's timezone (Intl — no tz dependency). */
export function dateStamp(now, timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(now).replace(/-/g, ''); // en-CA → YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10).replace(/-/g, '');
  }
}

/** The per-(restaurant, day) counter key. */
export function counterKey(restaurantId, stamp) {
  return `${restaurantId}:${stamp}`;
}

/** Assemble the final order number. */
export function buildOrderNumber({ prefix, orderType, stamp, sequence }) {
  const channel = ORDER_TYPE_CODE[orderType] ?? 'ORD';
  const seq = String(sequence).padStart(6, '0');
  return `${prefix}-${channel}-${stamp}-${seq}`;
}
