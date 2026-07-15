/**
 * Response DTO mappers for the QR Ordering module. Explicit shaping keeps the
 * API surface stable and — critically — NEVER leaks the QR signing `secret`.
 * The public/guest DTOs expose only the opaque `sessionId` and the guest's own
 * (cryptographically bound) ordering context.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);

export function toTableGroupDTO(g) {
  if (!g) return null;
  return {
    id: id(g),
    organizationId: oid(g.organizationId),
    restaurantId: oid(g.restaurantId),
    branchId: oid(g.branchId),
    name: g.name,
    type: g.type,
    floor: g.floor ?? '',
    description: g.description ?? '',
    displayOrder: g.displayOrder ?? 0,
    isActive: g.isActive !== false,
    createdAt: g.createdAt ?? null,
  };
}

export function toTableDTO(t) {
  if (!t) return null;
  return {
    id: id(t),
    organizationId: oid(t.organizationId),
    restaurantId: oid(t.restaurantId),
    branchId: oid(t.branchId),
    groupId: oid(t.groupId),
    floor: t.floor ?? '',
    zone: t.zone ?? '',
    number: t.number,
    name: t.name ?? '',
    seatingCapacity: t.seatingCapacity ?? 2,
    shape: t.shape,
    status: t.status,
    isReserved: Boolean(t.isReserved),
    isOrderingEnabled: t.isOrderingEnabled !== false,
    activeQrCodeId: oid(t.activeQrCodeId),
    currentSessionId: t.currentSessionId ?? null,
    occupiedAt: t.occupiedAt ?? null,
    displayOrder: t.displayOrder ?? 0,
    createdAt: t.createdAt ?? null,
  };
}

/** Management-facing QR DTO. Exposes the printable code/url + image, NEVER the
 * signing secret. */
export function toQrDTO(q) {
  if (!q) return null;
  return {
    id: id(q),
    organizationId: oid(q.organizationId),
    restaurantId: oid(q.restaurantId),
    branchId: oid(q.branchId),
    tableId: oid(q.tableId),
    type: q.type,
    status: q.status,
    code: q.code,
    scanUrl: q.scanUrl,
    imageUrl: q.imageUrl ?? null,
    secretVersion: q.secretVersion ?? 1,
    expiresAt: q.expiresAt ?? null,
    scanCount: q.scanCount ?? 0,
    lastScannedAt: q.lastScannedAt ?? null,
    createdAt: q.createdAt ?? null,
  };
}

/** Staff/admin-facing session DTO (full history record). */
export function toSessionDTO(s) {
  if (!s) return null;
  return {
    id: id(s),
    sessionId: s.sessionId,
    organizationId: oid(s.organizationId),
    restaurantId: oid(s.restaurantId),
    branchId: oid(s.branchId),
    tableId: oid(s.tableId),
    qrCodeId: oid(s.qrCodeId),
    guestId: s.guestId,
    identityType: s.identityType,
    customerUserId: oid(s.customerUserId),
    guestName: s.guestName ?? '',
    guestCount: s.guestCount ?? 1,
    status: s.status,
    lastActivityAt: s.lastActivityAt ?? null,
    expiresAt: s.expiresAt ?? null,
    endedAt: s.endedAt ?? null,
    endedReason: s.endedReason ?? null,
    createdAt: s.createdAt ?? null,
  };
}

/** Public/guest-facing session DTO returned to the customer's device. */
export function toPublicSessionDTO(s) {
  if (!s) return null;
  return {
    sessionId: s.sessionId,
    status: s.status,
    guestId: s.guestId,
    identityType: s.identityType,
    guestName: s.guestName ?? '',
    organizationId: oid(s.organizationId),
    restaurantId: oid(s.restaurantId),
    branchId: oid(s.branchId),
    tableId: oid(s.tableId),
    expiresAt: s.expiresAt ?? null,
    lastActivityAt: s.lastActivityAt ?? null,
    createdAt: s.createdAt ?? null,
  };
}
