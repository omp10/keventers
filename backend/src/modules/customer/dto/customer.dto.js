/**
 * Customer Platform DTO mappers. Monetary values are integer minor units; points
 * are integers. Internal Mongoose fields never leak; ids are strings. Customer-
 * facing DTOs omit staff-only internals (tags, metadata, raw userId).
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v == null ? null : String(v));

export function toCustomerDTO(c, { forStaff = false } = {}) {
  if (!c) return null;
  const base = {
    id: id(c),
    displayName: c.displayName ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    accountStatus: c.accountStatus,
    origin: c.origin,
    preferences: toPreferencesDTO(c.preferences),
    marketing: { optedIn: Boolean(c.marketing?.optedIn) },
    stats: toStatsDTO(c.stats),
    createdAt: c.createdAt ?? null,
  };
  if (forStaff) {
    return {
      ...base,
      userId: oid(c.userId),
      tags: c.tags ?? [],
      marketing: { optedIn: Boolean(c.marketing?.optedIn), consents: c.marketing?.consents ?? [] },
      timeline: (c.timeline ?? []).slice(-20),
      gdprErasedAt: c.gdprErasedAt ?? null,
    };
  }
  return base;
}

/** Compact summary for staff/admin list views. */
export function toCustomerSummaryDTO(c) {
  if (!c) return null;
  return {
    id: id(c),
    displayName: c.displayName ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    accountStatus: c.accountStatus,
    totalOrders: c.stats?.totalOrders ?? 0,
    lifetimeSpend: c.stats?.lifetimeSpend ?? 0,
    lastVisitAt: c.stats?.lastVisitAt ?? null,
    createdAt: c.createdAt ?? null,
  };
}

export function toPreferencesDTO(p = {}) {
  return {
    favoriteProductIds: (p?.favoriteProductIds ?? []).map(oid),
    favoriteCategoryIds: (p?.favoriteCategoryIds ?? []).map(oid),
    dietary: p?.dietary ?? [],
    allergies: p?.allergies ?? [],
    language: p?.language ?? 'en',
    notifications: {
      orderUpdates: p?.notifications?.orderUpdates ?? true,
      promotions: p?.notifications?.promotions ?? false,
      loyalty: p?.notifications?.loyalty ?? true,
    },
  };
}

export function toStatsDTO(s = {}) {
  return {
    totalOrders: s?.totalOrders ?? 0,
    completedOrders: s?.completedOrders ?? 0,
    cancelledOrders: s?.cancelledOrders ?? 0,
    lifetimeSpend: s?.lifetimeSpend ?? 0,
    totalRefunded: s?.totalRefunded ?? 0,
    avgOrderValue: s?.avgOrderValue ?? 0,
    visitCount: s?.visitCount ?? 0,
    lastVisitAt: s?.lastVisitAt ?? null,
    favoriteProducts: (s?.favoriteProducts ?? []).map((f) => ({ productId: oid(f.productId), name: f.name ?? null, orderedCount: f.orderedCount ?? 0 })),
  };
}

export function toAddressDTO(a) {
  if (!a) return null;
  return {
    id: id(a),
    type: a.type,
    label: a.label ?? null,
    contactName: a.contactName ?? null,
    contactPhone: a.contactPhone ?? null,
    line1: a.line1,
    line2: a.line2 ?? null,
    landmark: a.landmark ?? null,
    city: a.city,
    state: a.state ?? null,
    postalCode: a.postalCode ?? null,
    country: a.country ?? 'IN',
    geo: a.geo?.coordinates ? { lng: a.geo.coordinates[0], lat: a.geo.coordinates[1] } : null,
    isDefault: Boolean(a.isDefault),
    createdAt: a.createdAt ?? null,
  };
}

export function toLoyaltyDTO(acc) {
  if (!acc) return null;
  return {
    balance: acc.balance ?? 0,
    lifetimePoints: acc.lifetimePoints ?? 0,
    redeemedPoints: acc.redeemedPoints ?? 0,
    expiredPoints: acc.expiredPoints ?? 0,
    tier: acc.tier ?? 'bronze',
    tierUpdatedAt: acc.tierUpdatedAt ?? null,
    lastEarnedAt: acc.lastEarnedAt ?? null,
    lastRedeemedAt: acc.lastRedeemedAt ?? null,
  };
}

export function toLedgerDTO(e) {
  if (!e) return null;
  return {
    id: id(e),
    reference: e.reference,
    type: e.type,
    points: e.points,
    balanceAfter: e.balanceAfter,
    source: { type: e.source?.type ?? null, id: e.source?.id ?? null },
    orderId: oid(e.orderId),
    rewardId: oid(e.rewardId),
    expiresAt: e.expiresAt ?? null,
    reason: e.reason ?? null,
    createdAt: e.createdAt ?? null,
  };
}

export function toRewardDTO(r) {
  if (!r) return null;
  return {
    id: id(r),
    name: r.name,
    description: r.description ?? null,
    type: r.type,
    pointsCost: r.pointsCost,
    value: {
      discountBps: r.value?.discountBps ?? null,
      discountAmount: r.value?.discountAmount ?? 0,
      maxDiscountAmount: r.value?.maxDiscountAmount ?? 0,
      minOrderAmount: r.value?.minOrderAmount ?? 0,
      freeProductId: oid(r.value?.freeProductId),
      cashbackAmount: r.value?.cashbackAmount ?? 0,
      currency: r.value?.currency ?? 'INR',
    },
    status: r.status,
    minTier: r.minTier ?? null,
    availableUntil: r.availableUntil ?? null,
    imageUrl: r.imageUrl ?? null,
  };
}

export function toRedemptionDTO(r) {
  if (!r) return null;
  return {
    id: id(r),
    code: r.code,
    rewardId: oid(r.rewardId),
    rewardType: r.rewardType,
    pointsSpent: r.pointsSpent,
    outcome: {
      discountBps: r.outcome?.discountBps ?? null,
      discountAmount: r.outcome?.discountAmount ?? 0,
      maxDiscountAmount: r.outcome?.maxDiscountAmount ?? 0,
      minOrderAmount: r.outcome?.minOrderAmount ?? 0,
      freeProductId: oid(r.outcome?.freeProductId),
      cashbackAmount: r.outcome?.cashbackAmount ?? 0,
      currency: r.outcome?.currency ?? 'INR',
    },
    status: r.status,
    expiresAt: r.expiresAt ?? null,
    appliedOrderId: oid(r.appliedOrderId),
    createdAt: r.createdAt ?? null,
  };
}

export function toReferralDTO(r) {
  if (!r) return null;
  return {
    id: id(r),
    code: r.code,
    status: r.status,
    referrerRewardPoints: r.referrerRewardPoints ?? 0,
    refereeRewardPoints: r.refereeRewardPoints ?? 0,
    channel: r.channel ?? null,
    completedAt: r.completedAt ?? null,
    createdAt: r.createdAt ?? null,
  };
}
