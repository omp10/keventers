import { METRIC } from '../constants/analytics.constants.js';

/**
 * Analytics DTO mappers + derived-metric helpers. Averages are DERIVED from the
 * stored sum+count pairs here (never stored as mutable averages), so a dashboard
 * read is always internally consistent. All money is integer minor units.
 */
const oid = (v) => (v == null ? null : String(v));

const div = (sum, count) => (count > 0 ? Math.round(sum / count) : 0);

/** Reduce a raw metrics map into the derived sales KPIs. */
export function toSalesDTO(m = {}) {
  const gross = m[METRIC.GROSS_REVENUE] ?? 0;
  const net = m[METRIC.NET_REVENUE] ?? 0;
  const completed = m[METRIC.ORDERS_COMPLETED] ?? 0;
  return {
    grossRevenue: gross,
    netRevenue: net,
    taxTotal: m[METRIC.TAX_TOTAL] ?? 0,
    discountTotal: m[METRIC.DISCOUNT_TOTAL] ?? 0,
    refundTotal: m[METRIC.REFUND_TOTAL] ?? 0,
    itemCount: m[METRIC.ITEM_COUNT] ?? 0,
    ordersCompleted: completed,
    averageOrderValue: div(net, completed),
  };
}

export function toOrdersDTO(m = {}) {
  return {
    ordersPlaced: m[METRIC.ORDERS_PLACED] ?? 0,
    ordersCompleted: m[METRIC.ORDERS_COMPLETED] ?? 0,
    ordersCancelled: m[METRIC.ORDERS_CANCELLED] ?? 0,
    averagePrepTimeMs: div(m[METRIC.PREP_TIME_SUM] ?? 0, m[METRIC.PREP_TIME_COUNT] ?? 0),
    averageCompletionTimeMs: div(m[METRIC.COMPLETION_TIME_SUM] ?? 0, m[METRIC.COMPLETION_TIME_COUNT] ?? 0),
  };
}

export function toPaymentsDTO(m = {}) {
  const captured = m[METRIC.PAYMENTS_CAPTURED] ?? 0;
  const failed = m[METRIC.PAYMENTS_FAILED] ?? 0;
  const refunded = m[METRIC.PAYMENTS_REFUNDED] ?? 0;
  const attempts = captured + failed;
  return {
    captured,
    failed,
    refunded,
    capturedAmount: m[METRIC.CAPTURED_AMOUNT] ?? 0,
    refundedAmount: m[METRIC.REFUNDED_AMOUNT] ?? 0,
    successRate: attempts > 0 ? round2(captured / attempts) : null,
    failureRate: attempts > 0 ? round2(failed / attempts) : null,
    refundRate: captured > 0 ? round2(refunded / captured) : null,
  };
}

export function toKitchenDTO(m = {}) {
  const met = m[METRIC.SLA_MET] ?? 0;
  const breached = m[METRIC.SLA_BREACHED] ?? 0;
  const total = met + breached;
  return {
    readyCount: m[METRIC.READY_COUNT] ?? 0,
    slaMet: met,
    slaBreached: breached,
    delayedOrders: m[METRIC.DELAYED_ORDERS] ?? 0,
    slaCompliance: total > 0 ? round2(met / total) : null,
    averagePrepTimeMs: div(m[METRIC.PREP_TIME_SUM] ?? 0, m[METRIC.PREP_TIME_COUNT] ?? 0),
  };
}

export function toCustomersDTO(m = {}) {
  return {
    newCustomers: m[METRIC.NEW_CUSTOMERS] ?? 0,
    returningCustomers: m[METRIC.RETURNING_CUSTOMERS] ?? 0,
    loyaltyEarned: m[METRIC.LOYALTY_EARNED] ?? 0,
    loyaltyRedeemed: m[METRIC.LOYALTY_REDEEMED] ?? 0,
    referralsCompleted: m[METRIC.REFERRALS_COMPLETED] ?? 0,
  };
}

export function toNotificationsDTO(m = {}) {
  const sent = m[METRIC.NTF_SENT] ?? 0;
  const delivered = m[METRIC.NTF_DELIVERED] ?? 0;
  const failed = m[METRIC.NTF_FAILED] ?? 0;
  const read = m[METRIC.NTF_READ] ?? 0;
  const attempted = delivered + failed;
  return {
    queued: m[METRIC.NTF_QUEUED] ?? 0,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: attempted > 0 ? round2(delivered / attempted) : null,
    readRate: delivered > 0 ? round2(read / delivered) : null,
    failureRate: attempted > 0 ? round2(failed / attempted) : null,
  };
}

export function toQrDTO(m = {}) {
  const scans = m[METRIC.QR_SCANS] ?? 0;
  const started = m[METRIC.SESSIONS_STARTED] ?? 0;
  const completed = m[METRIC.SESSIONS_COMPLETED] ?? 0;
  const abandoned = m[METRIC.SESSIONS_ABANDONED] ?? 0;
  const conversions = m[METRIC.CONVERSIONS] ?? 0;
  return {
    scans,
    sessionsStarted: started,
    sessionsCompleted: completed,
    sessionsAbandoned: abandoned,
    conversions,
    conversionRate: scans > 0 ? round2(conversions / scans) : null,
    abandonmentRate: started > 0 ? round2(abandoned / started) : null,
    averageSessionDurationMs: div(m[METRIC.SESSION_DURATION_SUM] ?? 0, m[METRIC.SESSION_DURATION_COUNT] ?? 0),
  };
}

/** Entity leaderboard row (product/chef/station/provider/channel/table). */
export function toEntityDTO(e) {
  if (!e) return null;
  return {
    entityId: oid(e.entityId),
    entityType: e.entityType,
    name: e.name ?? null,
    metrics: e.metrics ?? {},
  };
}

export function toRebuildRunDTO(r) {
  if (!r) return null;
  return {
    id: r._id ? String(r._id) : (r.id ?? null),
    type: r.type,
    domain: r.domain ?? null,
    status: r.status,
    range: r.range ?? null,
    processed: r.processed ?? 0,
    projectionsWritten: r.projectionsWritten ?? 0,
    reconStatus: r.reconStatus ?? null,
    mismatches: r.mismatches ?? [],
    error: r.error ?? null,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    durationMs: r.durationMs ?? null,
  };
}

function round2(n) {
  return Math.round(n * 10000) / 10000;
}
