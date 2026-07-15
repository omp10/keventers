/**
 * Response DTO mappers for the cart. Monetary fields are integer MINOR units
 * (the pricing breakdown is already serialized by the Pricing Engine's DTO).
 * Never exposes raw Mongoose internals.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);

export function toCartItemDTO(it) {
  if (!it) return null;
  return {
    id: id(it),
    productId: oid(it.productId),
    product: it.productSnapshot ?? null,
    variantId: oid(it.variantId),
    variant: it.variantSnapshot ?? null,
    modifiers: (it.modifiers ?? []).map((m) => ({
      groupId: oid(m.groupId),
      groupName: m.groupName ?? '',
      modifierId: oid(m.modifierId),
      name: m.name ?? '',
      unitPrice: m.unitPrice ?? 0,
    })),
    addons: (it.addons ?? []).map((a) => ({
      addonId: oid(a.addonId),
      name: a.name ?? '',
      unitPrice: a.unitPrice ?? 0,
    })),
    quantity: it.quantity,
    specialInstructions: it.specialInstructions ?? '',
    notes: it.notes ?? '',
    pricing: it.pricing ?? null,
    lineSubtotal: it.lineSubtotal ?? 0,
  };
}

export function toCartDTO(cart) {
  if (!cart) return null;
  return {
    id: id(cart),
    organizationId: oid(cart.organizationId),
    restaurantId: oid(cart.restaurantId),
    branchId: oid(cart.branchId),
    sessionId: cart.sessionId,
    guestId: cart.guestId ?? null,
    customerUserId: oid(cart.customerUserId),
    tableId: oid(cart.tableId),
    currency: cart.currency,
    status: cart.status,
    items: (cart.items ?? []).map(toCartItemDTO),
    itemCount: (cart.items ?? []).reduce((n, it) => n + (it.quantity ?? 0), 0),
    coupon: cart.coupon?.code ? { code: cart.coupon.code, couponId: oid(cart.coupon.couponId) } : null,
    pricing: cart.pricing ?? null,
    version: cart.version ?? 0,
    expiresAt: cart.expiresAt ?? null,
    lastActivityAt: cart.lastActivityAt ?? null,
    lockedAt: cart.lockedAt ?? null,
    convertedOrderId: oid(cart.convertedOrderId),
    createdAt: cart.createdAt ?? null,
    updatedAt: cart.updatedAt ?? null,
  };
}
