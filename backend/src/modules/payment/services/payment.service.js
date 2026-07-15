import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { Money } from '#modules/pricing/index.js';
import { orderService, PAYMENT_STATUS as ORDER_PAYMENT_STATUS } from '#modules/order/index.js';

import {
  INTENT_STATUS,
  PAYMENT_ERRORS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REDIS_KEYS,
  SOCKET_EVENTS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../constants/payment.constants.js';
import { toPaymentDTO } from '../dto/payment.dto.js';
import {
  PaymentAuthorizedEvent,
  PaymentCapturedEvent,
  PaymentFailedEvent,
} from '../events/payment.events.js';
import { paymentIntentRepository } from '../repositories/payment-intent.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { entityId } from '../utils/id.util.js';
import { assertGuestAccess, loadForStaff, resolveStaffScope } from '../utils/tenant.util.js';

import { invoiceService } from './invoice.service.js';
import { paymentConfigService } from './payment-config.service.js';
import { paymentRealtimeService } from './payment-realtime.service.js';
import { transactionService } from './transaction.service.js';

/**
 * Payment orchestrator. Verifies gateway results, records payments (multi-tender
 * per order), appends the immutable transaction ledger, keeps the Order in sync
 * (via its sanctioned `recordPaymentStatus` DI seam — never mutating order
 * state) and generates the invoice on full payment. It NEVER computes prices
 * (amount comes from the intent/order snapshot) and is provider-agnostic. The
 * same settle path serves customer confirm AND webhooks (idempotent).
 */
export class PaymentService extends BaseService {
  constructor({
    payments = paymentRepository,
    intents = paymentIntentRepository,
    transactions = transactionService,
    configs = paymentConfigService,
    invoices = invoiceService,
    orders = orderService,
    realtime = paymentRealtimeService,
    resolveScope = resolveStaffScope,
    lock = distributedLock,
    eventBus,
  } = {}) {
    super({ name: 'payment', eventBus });
    this.payments = payments;
    this.intents = intents;
    this.transactions = transactions;
    this.configs = configs;
    this.invoices = invoices;
    this.orders = orders;
    this.realtime = realtime;
    this.resolveScope = resolveScope;
    this.lock = lock;
  }

  #scopeOf(o) {
    return { organizationId: String(o.organizationId), restaurantId: String(o.restaurantId), branchId: String(o.branchId) };
  }

  // ==================== CUSTOMER CONFIRM ====================

  /**
   * Confirm a payment after the customer completes it on the gateway. Verifies
   * the provider signature, then settles (idempotent by providerPaymentRef).
   */
  async confirm(guestScope, { intentId, providerPayload = {}, headers = {} } = {}) {
    const intent = await this.intents.findById(intentId);
    if (!intent) throw new NotFoundError(PAYMENT_ERRORS.INTENT_NOT_FOUND);
    if (String(intent.sessionId ?? '') !== guestScope.sessionId) throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);

    const order = await this.orders.getByIdSystem(String(intent.orderId));
    if (!order) throw new NotFoundError(PAYMENT_ERRORS.ORDER_NOT_FOUND);
    const scope = this.#scopeOf(order);

    const { provider: adapter } = await this.configs.resolveProvider(
      { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      intent.provider,
    );

    const verdict = adapter.verifyPayment({ payload: providerPayload, headers });
    if (!verdict.valid) {
      await this.#recordFailure(scope, { order, intent, provider: intent.provider, reason: verdict.reason ?? 'signature_invalid' });
      throw new ForbiddenError(PAYMENT_ERRORS.SIGNATURE_INVALID);
    }

    return this.#settle(scope, {
      order,
      intent,
      adapter,
      provider: intent.provider,
      method: intent.method,
      amount: intent.amount,
      providerPaymentRef: verdict.providerPaymentRef,
      preCaptured: verdict.status === 'captured',
      providerResponse: { via: 'confirm' },
    });
  }

  // ==================== SETTLE (shared: confirm + webhook) ====================

  async #settle(scope, { order, intent, adapter, provider, method, amount, providerPaymentRef, preCaptured = false, providerResponse = null }) {
    const orderId = String(order.id ?? order._id);
    return this.lock.withLock(
      `${REDIS_KEYS.PAYMENT_LOCK}:order:${orderId}`,
      async () => {
        // Idempotency: a payment for this provider ref already exists.
        if (providerPaymentRef) {
          const dup = await this.payments.findByProviderRef(providerPaymentRef);
          if (dup) return toPaymentDTO(dup);
        }

        const currency = order.currency ?? 'INR';
        let captured = preCaptured;
        if (!captured && adapter) {
          const cap = await adapter.capturePayment({ providerPaymentRef, amount, currency });
          captured = Boolean(cap.captured);
        }
        const now = new Date();
        const status = captured ? PAYMENT_STATUS.CAPTURED : PAYMENT_STATUS.AUTHORIZED;

        const payment = await this.payments.createScoped(scope, {
          orderId,
          orderNumber: order.orderNumber,
          intentId: intent ? entityId(intent) : null,
          sessionId: order.sessionId,
          customerUserId: order.customerUserId ?? null,
          provider,
          method: method ?? null,
          amount,
          currency,
          status,
          providerPaymentRef: providerPaymentRef ?? null,
          attempts: [{ at: now, status, providerPaymentRef: providerPaymentRef ?? null }],
          authorizedAt: now,
          capturedAt: captured ? now : null,
        });

        // Immutable ledger.
        await this.transactions.record(scope, { orderId, paymentId: entityId(payment), type: TRANSACTION_TYPE.AUTHORIZATION, amount, currency, provider, status: TRANSACTION_STATUS.SUCCESS, providerTxnId: providerPaymentRef });
        if (captured) {
          await this.transactions.record(scope, { orderId, paymentId: entityId(payment), type: TRANSACTION_TYPE.CAPTURE, amount, currency, provider, status: TRANSACTION_STATUS.SUCCESS, providerTxnId: providerPaymentRef, providerResponse });
        }

        if (intent) await this.intents.updateById(entityId(intent), { status: captured ? INTENT_STATUS.CAPTURED : INTENT_STATUS.AUTHORIZED });

        await this.#syncOrder(order, scope, currency);

        await this.events.publish(new PaymentAuthorizedEvent(this.#eventBase(payment)));
        this.realtime.emit(payment, SOCKET_EVENTS.PAYMENT_AUTHORIZED);
        if (captured) {
          await this.events.publish(new PaymentCapturedEvent(this.#eventBase(payment)));
          this.realtime.emit(payment, SOCKET_EVENTS.PAYMENT_CAPTURED);
        }
        this.audit.success('payment.captured', { targetId: entityId(payment), metadata: { orderId, amount, provider } });
        return toPaymentDTO(payment);
      },
      { ttlMs: 8000 },
    );
  }

  /** Keep the Order's payment status in sync + generate the invoice when fully paid. */
  async #syncOrder(order, scope, currency) {
    const orderId = String(order.id ?? order._id);
    const total = Money.of(order.pricing?.total?.amount ?? 0, currency);
    const settled = Money.of(await this.payments.sumSettledForOrder(orderId), currency);
    const fullyPaid = settled.amount >= total.amount && total.amount > 0;
    await this.orders
      .recordPaymentStatus(orderId, fullyPaid ? ORDER_PAYMENT_STATUS.CAPTURED : ORDER_PAYMENT_STATUS.AUTHORIZED)
      .catch((err) => this.logger.warn({ err }, 'order recordPaymentStatus failed (continuing)'));
    if (fullyPaid) {
      await this.invoices.generateForOrder(order).catch((err) => this.logger.warn({ err }, 'invoice generation failed (continuing)'));
    }
  }

  async #recordFailure(scope, { order, intent, provider, reason }) {
    const orderId = String(order.id ?? order._id);
    const payment = await this.payments.createScoped(scope, {
      orderId,
      orderNumber: order.orderNumber,
      intentId: intent ? entityId(intent) : null,
      sessionId: order.sessionId,
      provider,
      amount: intent?.amount ?? 0,
      currency: order.currency ?? 'INR',
      status: PAYMENT_STATUS.FAILED,
      failureReason: reason,
      failedAt: new Date(),
    });
    await this.transactions.record(scope, { orderId, paymentId: entityId(payment), type: TRANSACTION_TYPE.FAILURE, amount: intent?.amount ?? 0, provider, status: TRANSACTION_STATUS.FAILED, failureReason: reason });
    if (intent) await this.intents.updateById(entityId(intent), { status: INTENT_STATUS.FAILED });
    await this.orders.recordPaymentStatus(orderId, ORDER_PAYMENT_STATUS.FAILED).catch(() => {});
    await this.events.publish(new PaymentFailedEvent({ ...this.#eventBase(payment), reason }));
    this.realtime.emit(payment, SOCKET_EVENTS.PAYMENT_FAILED);
    this.audit.failure('payment.failed', { targetId: entityId(payment), metadata: { orderId, reason } });
    return toPaymentDTO(payment);
  }

  #eventBase(payment) {
    return {
      paymentId: entityId(payment),
      orderId: String(payment.orderId),
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      restaurantId: String(payment.restaurantId),
      branchId: String(payment.branchId),
    };
  }

  // ==================== WEBHOOK ENTRY (called by WebhookService) ====================

  /** Apply a verified webhook result idempotently (capture or fail). */
  async applyWebhookResult({ scope, order, provider, adapter, parsed }) {
    if (!order) return null;
    if (parsed.status === 'captured' || parsed.status === 'authorized') {
      return this.#settle(scope, {
        order,
        intent: null,
        adapter,
        provider,
        method: null,
        amount: parsed.amount ?? order.pricing?.total?.amount ?? 0,
        providerPaymentRef: parsed.providerPaymentRef,
        preCaptured: parsed.status === 'captured',
        providerResponse: { via: 'webhook', eventType: parsed.eventType },
      });
    }
    return this.#recordFailure(scope, { order, intent: null, provider, reason: parsed.eventType ?? 'gateway_failure' });
  }

  // ==================== MANUAL (cash / counter) ====================

  /** Record a manual tender (e.g. cash) — staff-initiated, no gateway. */
  async recordManualPayment(tenant, { orderId, amount, method = PAYMENT_METHOD.CASH }, actorId = null) {
    const order = await this.orders.getByIdSystem(orderId);
    if (!order) throw new NotFoundError(PAYMENT_ERRORS.ORDER_NOT_FOUND);
    const scope = this.#scopeOf(order);
    // Staff must own the restaurant.
    const check = await this.resolveScope(tenant, scope.restaurantId, scope.branchId).catch(() => null);
    if (!check) throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);

    const currency = order.currency ?? 'INR';
    const total = Money.of(order.pricing?.total?.amount ?? 0, currency);
    const settled = Money.of(await this.payments.sumSettledForOrder(orderId), currency);
    const remaining = total.subtract(settled).max(Money.zero(currency));
    const amt = Money.of(Math.trunc(amount), currency);
    if (amt.isZero() || amt.amount > remaining.amount) throw new BadRequestError(PAYMENT_ERRORS.AMOUNT_EXCEEDS_BALANCE);

    const now = new Date();
    const payment = await this.payments.createScoped(scope, {
      orderId,
      orderNumber: order.orderNumber,
      sessionId: order.sessionId,
      customerUserId: order.customerUserId ?? null,
      provider: null,
      method,
      amount: amt.amount,
      currency,
      status: PAYMENT_STATUS.CAPTURED,
      capturedAt: now,
      authorizedAt: now,
    });
    await this.transactions.record(scope, { orderId, paymentId: entityId(payment), type: TRANSACTION_TYPE.CAPTURE, amount: amt.amount, currency, provider: null, status: TRANSACTION_STATUS.SUCCESS });
    await this.#syncOrder(order, scope, currency);
    await this.events.publish(new PaymentCapturedEvent(this.#eventBase(payment)));
    this.realtime.emit(payment, SOCKET_EVENTS.PAYMENT_CAPTURED);
    this.audit.success('payment.manual_captured', { actorId, targetId: entityId(payment), metadata: { orderId, amount: amt.amount, method } });
    return toPaymentDTO(payment);
  }

  // ==================== READS ====================

  async getForGuest(guestScope, id) {
    const payment = await this.payments.findById(id);
    if (!payment) throw new NotFoundError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    assertGuestAccess(guestScope, payment);
    return toPaymentDTO(payment);
  }

  async getForStaff(tenant, id) {
    const payment = await loadForStaff(this.payments, tenant, id, PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    return toPaymentDTO(payment);
  }

  async listForStaff(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.provider) filter.provider = query.provider;
    if (query.orderId) filter.orderId = query.orderId;
    const page = await this.payments.paginateForStaff(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toPaymentDTO);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
