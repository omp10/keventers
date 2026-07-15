import { computeTimers } from '../utils/timers.util.js';

/**
 * Kitchen DTO mappers. Queue entries expose live, recomputed timers (source of
 * truth = the stored timestamps) so a display always shows accurate elapsed
 * time. Never leaks Mongoose internals.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);
const oids = (arr) => (Array.isArray(arr) ? arr.map((v) => String(v)) : []);

export function toStationDTO(s) {
  if (!s) return null;
  return {
    id: id(s),
    organizationId: oid(s.organizationId),
    restaurantId: oid(s.restaurantId),
    branchId: oid(s.branchId),
    name: s.name,
    type: s.type,
    code: s.code ?? '',
    description: s.description ?? '',
    routing: {
      productIds: oids(s.routing?.productIds),
      categoryIds: oids(s.routing?.categoryIds),
      isDefault: Boolean(s.routing?.isDefault),
    },
    isActive: s.isActive !== false,
    displayOrder: s.displayOrder ?? 0,
    createdAt: s.createdAt ?? null,
  };
}

export function toSlaTargetDTO(t) {
  if (!t) return null;
  return {
    id: id(t),
    branchId: oid(t.branchId),
    scope: t.scope,
    productId: oid(t.productId),
    categoryId: oid(t.categoryId),
    targetSeconds: t.targetSeconds,
    isActive: t.isActive !== false,
  };
}

export function toKitchenEntryDTO(e, now = new Date()) {
  if (!e) return null;
  return {
    id: id(e),
    organizationId: oid(e.organizationId),
    restaurantId: oid(e.restaurantId),
    branchId: oid(e.branchId),
    orderId: oid(e.orderId),
    orderNumber: e.orderNumber,
    tableId: oid(e.tableId),
    orderType: e.orderType ?? 'dine_in',
    status: e.status,
    priority: e.priority,
    items: (e.items ?? []).map((it) => ({
      productId: oid(it.productId),
      name: it.name,
      quantity: it.quantity,
      variantName: it.variantName ?? '',
      modifiers: it.modifiers ?? [],
      specialInstructions: it.specialInstructions ?? '',
      stationIds: oids(it.stationIds),
    })),
    stationIds: oids(e.stationIds),
    assignment: {
      mode: e.assignment?.mode ?? 'manual',
      currentChefId: oid(e.assignment?.currentChefId),
      assignedBy: oid(e.assignment?.assignedBy),
      assignedAt: e.assignment?.assignedAt ?? null,
    },
    timers: computeTimers(e.timers ?? {}, now),
    sla: {
      targetSeconds: e.sla?.targetSeconds ?? null,
      breached: Boolean(e.sla?.breached),
      breachedAt: e.sla?.breachedAt ?? null,
    },
    recallCount: e.recallCount ?? 0,
    refireCount: e.refireCount ?? 0,
    timeline: (e.timeline ?? []).map((t) => ({
      at: t.at,
      actorId: oid(t.actorId),
      actorType: t.actorType,
      previousStatus: t.previousStatus ?? null,
      newStatus: t.newStatus,
      reason: t.reason ?? '',
    })),
    version: e.version ?? 0,
    createdAt: e.createdAt ?? null,
    updatedAt: e.updatedAt ?? null,
  };
}

/** Compact board row (list). */
export function toKitchenBoardRowDTO(e, now = new Date()) {
  if (!e) return null;
  const timers = computeTimers(e.timers ?? {}, now);
  return {
    id: id(e),
    orderId: oid(e.orderId),
    orderNumber: e.orderNumber,
    tableId: oid(e.tableId),
    status: e.status,
    priority: e.priority,
    itemCount: (e.items ?? []).reduce((n, it) => n + (it.quantity ?? 0), 0),
    stationIds: oids(e.stationIds),
    currentChefId: oid(e.assignment?.currentChefId),
    elapsedSeconds: timers.totalKitchenTimeSeconds,
    prepTimeSeconds: timers.prepTimeSeconds,
    slaTargetSeconds: e.sla?.targetSeconds ?? null,
    slaBreached: Boolean(e.sla?.breached),
    queuedAt: e.timers?.queuedAt ?? null,
  };
}
