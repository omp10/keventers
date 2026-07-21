import { Money } from '../money/money.js';

/**
 * Serialize a Pricing Engine breakdown (a tree of Money objects) into a stable,
 * transport-ready shape. Every monetary field is emitted as
 * `{ amount, currency, major }` — the integer `amount` (minor units) is the
 * source of truth; `major` is for display only.
 */
const m = (money) => (money instanceof Money ? money.toJSON() : money);

export function toPricingBreakdownDTO(b) {
  if (!b) return null;
  return {
    currency: b.currency,
    items: (b.items ?? []).map((i) => ({
      reference: i.reference,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: m(i.unitPrice),
      lineSubtotal: m(i.lineSubtotal),
    })),
    subtotal: m(b.subtotal),
    discounts: {
      product: m(b.discounts.product),
      menu: m(b.discounts.menu),
      restaurant: m(b.discounts.restaurant),
      coupon: m(b.discounts.coupon),
      total: m(b.discounts.total),
      couponApplied: Boolean(b.discounts.couponApplied),
      couponReason: b.discounts.couponReason ?? null,
    },
    discountedSubtotal: m(b.discountedSubtotal),
    serviceCharge: m(b.serviceCharge),
    tax: {
      mode: b.tax.mode,
      lines: (b.tax.lines ?? []).map((l) => ({ name: l.name, bps: l.bps, amount: m(l.amount) })),
      total: m(b.tax.total),
    },
    charges: {
      delivery: m(b.charges.delivery),
      packaging: m(b.charges.packaging),
      platform: m(b.charges.platform),
      total: m(b.charges.total),
    },
    freeItems: b.freeItems ?? [],
    roundingAdjustment: m(b.roundingAdjustment),
    total: m(b.total),
  };
}

export function toCouponDTO(c) {
  if (!c) return null;
  const id = c._id ? String(c._id) : (c.id ?? null);
  return {
    id,
    organizationId: c.organizationId ? String(c.organizationId) : null,
    restaurantId: c.restaurantId ? String(c.restaurantId) : null,
    code: c.code,
    description: c.description ?? '',
    type: c.type,
    value: c.value,
    currency: c.currency ?? 'INR',
    minSubtotal: c.minSubtotal ?? null,
    maxDiscount: c.maxDiscount ?? null,
    targetProductId: c.targetProductId ? String(c.targetProductId) : null,
    buyQuantity: c.buyQuantity ?? null,
    getQuantity: c.getQuantity ?? null,
    status: c.status,
    validFrom: c.validFrom ?? null,
    validUntil: c.validUntil ?? null,
    usageLimit: c.usageLimit ?? null,
    usageCount: c.usageCount ?? 0,
    audience: c.audience ?? 'all',
    perCustomerLimit: c.perCustomerLimit ?? null,
    createdAt: c.createdAt ?? null,
  };
}
