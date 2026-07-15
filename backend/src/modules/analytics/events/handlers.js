import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { config } from '#config';
import { kitchenService } from '#modules/kitchen/index.js';
import { orderService } from '#modules/order/index.js';

import { projectionService } from '../services/projection.service.js';
import { analyticsRedisStore } from '../stores/analytics-redis.store.js';
import { scopeResolver } from '../utils/scope-resolver.js';
import * as salesOrder from '../projections/sales-order.updater.js';
import * as payment from '../projections/payment.updater.js';
import * as customer from '../projections/customer.updater.js';
import * as kitchen from '../projections/kitchen.updater.js';
import * as notification from '../projections/notification.updater.js';
import * as qrTable from '../projections/qr-table.updater.js';

/**
 * Analytics event CONSUMERS. The engine reacts to domain events from every
 * module and maintains read-optimized PROJECTIONS — it NEVER queries the
 * transactional collections for dashboards. Events are thin (ids + a scope
 * fragment), so a handler enriches via TRUSTED read seams (`getByIdSystem`,
 * kitchen entry, cached scope resolver) purely to compute increments, then hands
 * pure INSTRUCTIONS to the projection service. Every handler is defensive: a
 * failure is logged, never thrown back into the publisher.
 */
export function registerAnalyticsEventHandlers(bus = sharedEventBus, deps = {}) {
  const log = logger({ module: 'analytics', component: 'event-handlers' });
  const orders = deps.orders ?? orderService;
  const kitchens = deps.kitchen ?? kitchenService;
  const projections = deps.projections ?? projectionService;
  const scopes = deps.scopeResolver ?? scopeResolver;
  const store = deps.store ?? analyticsRedisStore;
  const prepTtl = config.analytics.prepCorrelationTtlSeconds;

  const scopeFromOrder = (o) => ({ organizationId: String(o.organizationId), restaurantId: String(o.restaurantId), branchId: o.branchId ? String(o.branchId) : null });
  const sub = (event, fn) => bus.subscribe(event, async (payload) => {
    try {
      await fn(payload);
    } catch (err) {
      log.warn({ err, event }, 'analytics handler failed (continuing)');
    }
  }, { name: `analytics.on.${event}` });

  const apply = (scope, instructions, at) => (instructions?.length ? projections.apply(scope, instructions, at) : null);

  // ---------- Orders / Sales / Products ----------
  sub('order.placed', async (p) => {
    const o = await orders.getByIdSystem(p.orderId);
    if (o) await apply(scopeFromOrder(o), salesOrder.onOrderPlaced(o, o.createdAt), o.createdAt ?? new Date());
  });
  sub('order.completed', async (p) => {
    const o = await orders.getByIdSystem(p.orderId);
    if (o) await apply(scopeFromOrder(o), salesOrder.onOrderCompleted(o, o.completedAt), o.completedAt ?? new Date());
  });
  sub('order.cancelled', async (p) => {
    const o = await orders.getByIdSystem(p.orderId);
    if (o) await apply(scopeFromOrder(o), salesOrder.onOrderCancelled(o), new Date());
  });

  // ---------- Payments ----------
  const paymentScope = async (p) => {
    const s = await scopes.fromRestaurant(p.restaurantId);
    return s ? { ...s, branchId: p.branchId ? String(p.branchId) : null } : null;
  };
  sub('payment.captured', async (p) => { const s = await paymentScope(p); if (s) await apply(s, payment.onPaymentCaptured(p), new Date()); });
  sub('payment.failed', async (p) => { const s = await paymentScope(p); if (s) await apply(s, payment.onPaymentFailed(p), new Date()); });
  sub('payment.refund_completed', async (p) => { const s = await paymentScope(p); if (s) await apply(s, payment.onRefundCompleted(p), new Date()); });

  // ---------- Kitchen ----------
  sub('kitchen.order.preparing', async (p) => {
    if (p.orderId) await store.recordPreparing(String(p.orderId), Date.now(), prepTtl);
  });
  sub('kitchen.order.ready', async (p) => {
    const entry = await kitchens.getByOrderIdSystem(p.orderId).catch(() => null);
    if (!entry?.organizationId) return;
    const scope = { organizationId: String(entry.organizationId), restaurantId: String(entry.restaurantId), branchId: entry.branchId ? String(entry.branchId) : null };
    const startedAt = await store.takePreparing(String(p.orderId));
    const prepMs = startedAt ? Date.now() - startedAt : null;
    await apply(scope, kitchen.onKitchenReady({ prepMs, chefId: entry.assignment?.currentChefId, stationIds: (entry.stationIds ?? []).map(String), breached: Boolean(entry.sla?.breached) }), new Date());
  });
  sub('kitchen.sla.breached', async (p) => {
    const s = await scopes.fromRestaurant(p.restaurantId);
    if (s) await apply({ ...s, branchId: p.branchId ? String(p.branchId) : null }, kitchen.onSlaBreached(), new Date());
  });

  // ---------- Customers / Loyalty ----------
  sub('customer.created', async (p) => {
    if (!p.organizationId || !p.restaurantId) return;
    await apply({ organizationId: String(p.organizationId), restaurantId: String(p.restaurantId) }, customer.onCustomerCreated({ returning: false }), new Date());
  });
  sub('customer.merged', async (p) => {
    if (p.created) return; // created=true already counted via customer.created
    const s = await scopes.fromRestaurant(p.restaurantId);
    if (s) await apply(s, customer.onCustomerCreated({ returning: true }), new Date());
  });
  sub('customer.loyalty.earned', async (p) => {
    const s = await scopes.fromRestaurant(p.restaurantId);
    if (s) await apply(s, customer.onLoyaltyEarned(p), new Date());
  });
  sub('customer.loyalty.redeemed', async (p) => {
    const s = await scopes.fromRestaurant(p.restaurantId);
    if (s) await apply(s, customer.onLoyaltyRedeemed(p), new Date());
  });
  sub('customer.tier.changed', async (p) => {
    const s = await scopes.fromRestaurant(p.restaurantId);
    if (s) await apply(s, customer.onTierChanged({ upgraded: isUpgrade(p.fromTier, p.toTier) }), new Date());
  });

  // ---------- Notifications ----------
  for (const event of ['notification.queued', 'notification.sent', 'notification.delivered', 'notification.read', 'notification.failed']) {
    sub(event, async (p) => {
      const s = await scopes.fromRestaurant(p.restaurantId);
      if (s) await apply(s, notification.onNotificationEvent(event, p), new Date());
    });
  }

  // ---------- QR / Sessions / Tables ----------
  sub('qr.scanned', async (p) => {
    const s = await scopes.fromBranch(p.branchId);
    if (s) await apply(s, qrTable.onQrScanned(), new Date());
  });
  sub('session.created', async (p) => {
    const s = await scopes.fromBranch(p.branchId);
    if (!s) return;
    await store.recordSessionStart(String(p.sessionId), Date.now(), prepTtl);
    await apply(s, qrTable.onSessionCreated({ tableId: p.tableId }), new Date());
  });
  sub('session.completed', async (p) => {
    const s = await scopes.fromBranch(p.branchId);
    if (!s) return;
    const startedAt = await store.takeSessionStart(String(p.sessionId));
    const durationMs = startedAt ? Date.now() - startedAt : null;
    await apply(s, qrTable.onSessionEnded({ tableId: p.tableId, durationMs, converted: true, completed: true }), new Date());
  });
  sub('session.expired', async (p) => {
    const s = await scopes.fromBranch(p.branchId);
    if (!s) return;
    const startedAt = await store.takeSessionStart(String(p.sessionId));
    const durationMs = startedAt ? Date.now() - startedAt : null;
    await apply(s, qrTable.onSessionEnded({ tableId: p.tableId, durationMs, converted: false, completed: false }), new Date());
  });

  log.info('Analytics event handlers registered');
}

/** True when toTier ranks above fromTier (bronze<silver<gold<platinum). */
const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
function isUpgrade(fromTier, toTier) {
  return TIER_ORDER.indexOf(toTier) > TIER_ORDER.indexOf(fromTier);
}

export default registerAnalyticsEventHandlers;
