import { DOMAIN, ENTITY_TYPE, METRIC } from '../constants/analytics.constants.js';
import { timeDimensions } from '../utils/period.util.js';

import { bucket, entity } from './instruction.js';

/**
 * Sales / Order / Product updaters (pure). Driven by ORDER events enriched with
 * the full order (pricing snapshot + items + timing). Sales revenue is taken from
 * the order's immutable Pricing-Engine snapshot — never recomputed. Product
 * analytics fan out per line item + its modifiers/add-ons.
 */

/** order.placed → order counters + hourly/weekday peak histograms. */
export function onOrderPlaced(order, at) {
  const { hourOfDay, dayOfWeek } = timeDimensions(at);
  return [bucket(DOMAIN.ORDERS, { [METRIC.ORDERS_PLACED]: 1 }, { hourly: { idx: hourOfDay, by: 1 }, weekday: { idx: dayOfWeek, by: 1 } })];
}

/** order.cancelled → cancelled counter. */
export function onOrderCancelled() {
  return [bucket(DOMAIN.ORDERS, { [METRIC.ORDERS_CANCELLED]: 1 })];
}

/**
 * order.completed → revenue (from the pricing snapshot), item count, completion
 * time, and per-product / category / modifier / add-on usage + revenue.
 */
export function onOrderCompleted(order, at) {
  const p = order.pricing ?? {};
  const gross = num(p.subtotal?.amount ?? p.itemsTotal?.amount ?? p.grossTotal?.amount);
  const tax = num(p.tax?.amount ?? p.taxTotal?.amount);
  const discount = num(p.discount?.amount ?? p.discountTotal?.amount);
  const net = num(p.total?.amount ?? p.grandTotal?.amount ?? gross + tax - discount);
  const items = order.items ?? [];
  const itemCount = items.reduce((n, it) => n + (it.quantity ?? 0), 0);

  const out = [
    bucket(DOMAIN.SALES, {
      [METRIC.GROSS_REVENUE]: gross,
      [METRIC.NET_REVENUE]: net,
      [METRIC.TAX_TOTAL]: tax,
      [METRIC.DISCOUNT_TOTAL]: discount,
      [METRIC.ITEM_COUNT]: itemCount,
    }),
    bucket(DOMAIN.ORDERS, { [METRIC.ORDERS_COMPLETED]: 1 }),
  ];

  // Completion time (createdAt → completedAt).
  const created = order.createdAt ? new Date(order.createdAt).getTime() : null;
  const completed = order.completedAt ? new Date(order.completedAt).getTime() : (at ? new Date(at).getTime() : null);
  if (created && completed && completed >= created) {
    out.push(bucket(DOMAIN.ORDERS, { [METRIC.COMPLETION_TIME_SUM]: completed - created, [METRIC.COMPLETION_TIME_COUNT]: 1 }));
  }

  // Per-item product/category revenue + modifier/add-on usage.
  for (const it of items) {
    const qty = it.quantity ?? 1;
    const lineRevenue = num(it.pricing?.lineTotal?.amount ?? it.lineSubtotal ?? 0);
    if (it.productId) out.push(entity(DOMAIN.PRODUCTS, ENTITY_TYPE.PRODUCT, it.productId, { [METRIC.UNITS_SOLD]: qty, [METRIC.PRODUCT_REVENUE]: lineRevenue }, it.product?.name ?? null));
    const categoryId = it.product?.categoryId ?? it.categoryId;
    if (categoryId) out.push(entity(DOMAIN.PRODUCTS, ENTITY_TYPE.CATEGORY, categoryId, { [METRIC.UNITS_SOLD]: qty, [METRIC.PRODUCT_REVENUE]: lineRevenue }, it.product?.categoryName ?? null));
    for (const m of it.modifiers ?? []) if (m.modifierId) out.push(entity(DOMAIN.PRODUCTS, ENTITY_TYPE.MODIFIER, m.modifierId, { [METRIC.USAGE_COUNT]: qty }, m.name ?? null));
    for (const a of it.addons ?? []) if (a.addonId) out.push(entity(DOMAIN.PRODUCTS, ENTITY_TYPE.ADDON, a.addonId, { [METRIC.USAGE_COUNT]: qty }, a.name ?? null));
  }
  return out;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
