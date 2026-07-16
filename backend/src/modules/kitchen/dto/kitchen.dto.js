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
  const timers = computeTimers(e.timers ?? {}, now);
  const targetSeconds = e.sla?.targetSeconds ?? null;
  const elapsedSeconds = timers.totalKitchenTimeSeconds ?? 0;
  const slaState =
    e.sla?.breached || (targetSeconds && elapsedSeconds >= targetSeconds)
      ? 'breached'
      : targetSeconds && elapsedSeconds >= targetSeconds * 0.8
        ? 'approaching'
        : 'on_time';
  return {
    id: id(e),
    organizationId: oid(e.organizationId),
    restaurantId: oid(e.restaurantId),
    branchId: oid(e.branchId),
    orderId: oid(e.orderId),
    orderNumber: e.orderNumber,
    tableId: oid(e.tableId),
    tableLabel: e.metadata?.tableLabel ?? (e.tableId ? `Table ${oid(e.tableId)}` : ''),
    orderType: e.orderType ?? 'dine_in',
    channel: e.orderType ?? 'dine_in',
    status: e.status,
    priority: e.priority,
    items: (e.items ?? []).map((it) => ({
      id: it.orderItemId ?? oid(it.productId),
      productId: oid(it.productId),
      name: it.name,
      quantity: it.quantity,
      variantName: it.variantName ?? '',
      modifiers: it.modifiers ?? [],
      specialInstructions: it.specialInstructions ?? '',
      instructions: it.specialInstructions ?? '',
      stationIds: oids(it.stationIds),
    })),
    stationIds: oids(e.stationIds),
    assignment: {
      mode: e.assignment?.mode ?? 'manual',
      currentChefId: oid(e.assignment?.currentChefId),
      assignedBy: oid(e.assignment?.assignedBy),
      assignedAt: e.assignment?.assignedAt ?? null,
    },
    timers: { ...timers, startedAt: timers.preparingAt },
    sla: {
      state: slaState,
      targetSeconds,
      elapsedSeconds,
      remainingSeconds: targetSeconds == null ? null : targetSeconds - elapsedSeconds,
      breached: Boolean(e.sla?.breached),
      breachedAt: e.sla?.breachedAt ?? null,
    },
    recallCount: e.recallCount ?? 0,
    refireCount: e.refireCount ?? 0,
    timeline: (e.timeline ?? []).map((t) => ({
      at: t.at,
      status: t.newStatus,
      actorId: oid(t.actorId),
      actorType: t.actorType,
      previousStatus: t.previousStatus ?? null,
      newStatus: t.newStatus,
      reason: t.reason ?? '',
    })),
    version: e.version ?? 0,
    paymentStatus: e.metadata?.paymentStatus ?? 'pending',
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
