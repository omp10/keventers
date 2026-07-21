import { NOTE_VISIBILITY } from '../constants/order.constants.js';

/**
 * Order DTO mappers. Monetary values are the integer-minor-unit Pricing-Engine
 * snapshot, passed through unchanged. Notes are filtered by the viewer's role
 * (customers never see INTERNAL notes).
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);

function toItemDTO(it) {
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
    addons: (it.addons ?? []).map((a) => ({ addonId: oid(a.addonId), name: a.name ?? '', unitPrice: a.unitPrice ?? 0 })),
    quantity: it.quantity,
    specialInstructions: it.specialInstructions ?? '',
    notes: it.notes ?? '',
    pricing: it.pricing ?? null,
    lineSubtotal: it.lineSubtotal ?? 0,
  };
}

function toTimelineDTO(t) {
  return {
    at: t.at,
    actorId: oid(t.actorId),
    actorType: t.actorType,
    previousStatus: t.previousStatus ?? null,
    newStatus: t.newStatus,
    reason: t.reason ?? '',
    metadata: t.metadata ?? {},
  };
}

function toNoteDTO(n) {
  return {
    id: id(n),
    type: n.type,
    visibility: n.visibility,
    body: n.body,
    authorType: n.authorType,
    at: n.at,
  };
}

/** Notes visible to the viewer: staff see all; customers only PUBLIC ones. */
function visibleNotes(notes = [], forStaff) {
  const filtered = forStaff ? notes : notes.filter((n) => n.visibility === NOTE_VISIBILITY.PUBLIC);
  return filtered.map(toNoteDTO);
}

/**
 * @param {object} order
 * @param {{ forStaff?: boolean }} [opts]
 */
export function toOrderDTO(order, { forStaff = false } = {}) {
  if (!order) return null;
  const base = {
    id: id(order),
    orderNumber: order.orderNumber,
    organizationId: oid(order.organizationId),
    restaurantId: oid(order.restaurantId),
    branchId: oid(order.branchId),
    sessionId: order.sessionId,
    guestId: order.guestId ?? null,
    customerUserId: oid(order.customerUserId),
    tableId: oid(order.tableId),
    orderType: order.orderType,
    status: order.status,
    currency: order.currency,
    items: (order.items ?? []).map(toItemDTO),
    itemCount: (order.items ?? []).reduce((n, it) => n + (it.quantity ?? 0), 0),
    pricing: order.pricing ?? null,
    coupon: order.coupon ?? null,
    timeline: (order.timeline ?? []).map(toTimelineDTO),
    notes: visibleNotes(order.notes ?? [], forStaff),
    payment: { status: order.payment?.status ?? null },
    refund: { status: order.refund?.status ?? 'none' },
    cancellation: order.cancellation?.source ? order.cancellation : null,
    placedAt: order.placedAt ?? null,
    completedAt: order.completedAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
    version: order.version ?? 0,
    createdAt: order.createdAt ?? null,
    updatedAt: order.updatedAt ?? null,
  };
  if (forStaff) {
    base.snapshots = order.snapshots ?? null;
    base.cartId = oid(order.cartId);
  }
  return base;
}

/** Lightweight list row (staff/customer). */
export function toOrderSummaryDTO(order, { forStaff = false } = {}) {
  if (!order) return null;
  return {
    id: id(order),
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    currency: order.currency,
    total: order.pricing?.total ?? null,
    // The order-history list renders the total and lets the customer rate each
    // DISH, so it needs the priced items and the full pricing block — a bare
    // `total` rendered as ₹0 and left the rating sheet with nothing to score.
    pricing: order.pricing ?? null,
    items: (order.items ?? []).map(toItemDTO),
    itemCount: (order.items ?? []).reduce((n, it) => n + (it.quantity ?? 0), 0),
    branchId: oid(order.branchId),
    restaurantId: oid(order.restaurantId),
    tableId: oid(order.tableId),
    // STAFF ONLY: lets the board flag follow-up orders from a table that is
    // already eating, and drives the one-bill-per-session view.
    ...(forStaff ? { sessionId: order.sessionId ? String(order.sessionId) : null } : {}),
    // A cancelled order in the history list said only "cancelled" — the customer
    // could not see WHY, or whether it was them or the restaurant. The reason is
    // the whole point of showing the status at all.
    cancellation: order.cancellation?.source ? order.cancellation : null,
    cancelledAt: order.cancelledAt ?? null,
    customerUserId: forStaff ? oid(order.customerUserId) : undefined,
    placedAt: order.placedAt ?? null,
    createdAt: order.createdAt ?? null,
  };
}
