import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { config } from '#config';
import { Money } from '#modules/pricing/index.js';
import { orderService } from '#modules/order/index.js';

import {
  INTENT_STATUS,
  PAYMENT_ERRORS,
  REDIS_KEYS,
} from '../constants/payment.constants.js';
import { toIntentDTO } from '../dto/payment.dto.js';
import { PaymentIntentCreatedEvent } from '../events/payment.events.js';
import { paymentIntentRepository } from '../repositories/payment-intent.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { paymentRedisStore } from '../stores/payment-redis.store.js';
import { entityId } from '../utils/id.util.js';
import { merchantTransactionId } from '../utils/reference.util.js';
import { assertGuestAccess } from '../utils/tenant.util.js';

import { paymentConfigService } from './payment-config.service.js';

/**
 * Payment Intent service — the ENTRY POINT of every payment. Given an order (and
 * an optional partial amount for multi-payment), it computes the payable amount
 * from the order's immutable Pricing-Engine snapshot (NEVER recalculating),
 * resolves the restaurant's provider, and asks the provider to create an intent.
 * Duplicate-safe (Redis lock + Idempotency-Key + unique index).
 */
export class PaymentIntentService extends BaseService {
  constructor({
    intents = paymentIntentRepository,
    payments = paymentRepository,
    configs = paymentConfigService,
    orders = orderService,
    store = paymentRedisStore,
    lock = distributedLock,
    paymentConfig = config.payment,
    eventBus,
  } = {}) {
    super({ name: 'payment.intent', eventBus });
    this.intents = intents;
    this.payments = payments;
    this.configs = configs;
    this.orders = orders;
    this.store = store;
    this.lock = lock;
    this.paymentConfig = paymentConfig;
  }

  /** Load the guest's order + verify ownership + tenant scope. */
  async #loadOrder(guestScope, orderId) {
    const order = await this.orders.getByIdSystem(orderId);
    if (!order) throw new NotFoundError(PAYMENT_ERRORS.ORDER_NOT_FOUND);
    assertGuestAccess(guestScope, order);
    if (order.status === 'cancelled') throw new BadRequestError(PAYMENT_ERRORS.ORDER_NOT_PAYABLE);
    return order;
  }

  #scopeOf(order) {
    return {
      organizationId: String(order.organizationId),
      restaurantId: String(order.restaurantId),
      branchId: String(order.branchId),
    };
  }

  /** Remaining payable balance for an order (order total − already settled). */
  async #remaining(order) {
    const currency = order.currency ?? 'INR';
    const total = Money.of(order.pricing?.total?.amount ?? 0, currency);
    const settled = Money.of(await this.payments.sumSettledForOrder(order.id ?? order._id), currency);
    return total.subtract(settled).max(Money.zero(currency));
  }

  async createIntent(guestScope, { orderId, provider = null, method = null, amount = null, idempotencyKey = null } = {}) {
    const order = await this.#loadOrder(guestScope, orderId);
    const scope = this.#scopeOf(order);

    if (idempotencyKey) {
      const prior = await this.store.getIdempotent(orderId, idempotencyKey);
      if (prior) return prior;
    }

    return this.lock.withLock(
      `${REDIS_KEYS.PAYMENT_LOCK}:intent:${orderId}`,
      async () => {
        // Idempotency at the data layer.
        const existing = await this.intents.findByOrderAndKey(orderId, idempotencyKey);
        if (existing) return toIntentDTO(existing);

        const currency = order.currency ?? 'INR';
        const remaining = await this.#remaining(order);
        if (remaining.isZero() || remaining.isNegative()) throw new BadRequestError(PAYMENT_ERRORS.ORDER_NOT_PAYABLE);

        const requested = amount != null ? Money.of(Math.trunc(amount), currency) : remaining;
        if (requested.isZero() || requested.isNegative()) throw new BadRequestError(PAYMENT_ERRORS.INVALID_AMOUNT);
        if (requested.amount > remaining.amount) throw new BadRequestError(PAYMENT_ERRORS.AMOUNT_EXCEEDS_BALANCE);

        // Resolve the provider (decrypts credentials inside the config service).
        const { provider: adapter, config: cfg } = await this.configs.resolveProvider(
          { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
          provider,
        );
        if (method) {
          const supported = new Set([...(cfg.enabledMethods ?? []), ...adapter.supportedMethods()]);
          if (!supported.has(method)) throw new BadRequestError(PAYMENT_ERRORS.METHOD_NOT_SUPPORTED);
        }

        // Persist the intent (PENDING) then call the gateway.
        const mtid = merchantTransactionId(order.orderNumber);
        let intent = await this.intents.createScoped(scope, {
          orderId,
          orderNumber: order.orderNumber,
          sessionId: guestScope.sessionId,
          customerUserId: guestScope.customerUserId,
          provider: cfg.provider,
          method,
          amount: requested.amount,
          currency,
          status: INTENT_STATUS.PENDING,
          idempotencyKey,
          expiresAt: new Date(Date.now() + this.paymentConfig.intentTtlSeconds * 1000),
        });

        const result = await adapter.createPaymentIntent({
          amount: requested.amount,
          currency,
          orderNumber: order.orderNumber,
          merchantTransactionId: mtid,
          method,
          notes: { orderId: String(orderId) },
        });
        intent = await this.intents.updateById(entityId(intent), {
          providerIntentRef: result.providerIntentRef,
          checkoutPayload: result.checkoutPayload,
        });

        await this.store.saveSession(entityId(intent), { orderId, provider: cfg.provider, amount: requested.amount }, this.paymentConfig.intentTtlSeconds);
        await this.events.publish(
          new PaymentIntentCreatedEvent({ intentId: entityId(intent), orderId: String(orderId), provider: cfg.provider, amount: requested.amount, restaurantId: scope.restaurantId }),
        );
        this.audit.success('payment.intent.created', { targetId: entityId(intent), metadata: { orderId: String(orderId), provider: cfg.provider, amount: requested.amount } });

        const dto = toIntentDTO(intent);
        if (idempotencyKey) await this.store.setIdempotent(orderId, idempotencyKey, dto, this.paymentConfig.idempotencyTtlSeconds);
        return dto;
      },
      { ttlMs: this.paymentConfig.lockTtlMs },
    );
  }

  /** Cancel any still-open intents for an order (invoked when the order is
   * cancelled). Best-effort; already-captured intents are left untouched. */
  async cancelForOrder(orderId) {
    const open = await this.intents.find({
      orderId,
      status: { $in: [INTENT_STATUS.CREATED, INTENT_STATUS.PENDING, INTENT_STATUS.AUTHORIZED] },
    });
    let cancelled = 0;
    for (const intent of open) {
      await this.intents.updateById(intent.id ?? intent._id, { status: INTENT_STATUS.CANCELLED });
      cancelled += 1;
    }
    return { cancelled };
  }

  async getIntent(guestScope, id) {
    const intent = await this.intents.findById(id);
    if (!intent) throw new NotFoundError(PAYMENT_ERRORS.INTENT_NOT_FOUND);
    if (String(intent.sessionId ?? '') !== guestScope.sessionId) throw new ForbiddenError(PAYMENT_ERRORS.CROSS_TENANT);
    return toIntentDTO(intent);
  }
}

export const paymentIntentService = new PaymentIntentService();
export default paymentIntentService;
