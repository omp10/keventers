import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ForbiddenError } from '#core/errors/app-error.js';
import { config } from '#config';
import { orderService } from '#modules/order/index.js';

import {
  PAYMENT_ERRORS,
  WEBHOOK_STATUS,
} from '../constants/payment.constants.js';
import { paymentIntentRepository } from '../repositories/payment-intent.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { webhookRepository } from '../repositories/webhook.repository.js';
import { providerFactory } from '../providers/provider.factory.js';
import { paymentRedisStore } from '../stores/payment-redis.store.js';
import { entityId } from '../utils/id.util.js';

import { paymentConfigService } from './payment-config.service.js';
import { paymentService } from './payment.service.js';

/**
 * Webhook handler — the security boundary for asynchronous gateway callbacks.
 * For every inbound webhook it enforces: SIGNATURE validation (per the resolved
 * restaurant's secret), REPLAY protection + IDEMPOTENCY (Redis fast-path +
 * durable unique (provider, eventId) index), payload parsing, then a single
 * idempotent settle via the PaymentService. Provider-agnostic: the concrete
 * gateway is resolved from the referenced order's restaurant config.
 */
export class WebhookService extends BaseService {
  constructor({
    webhooks = webhookRepository,
    payments = paymentRepository,
    intents = paymentIntentRepository,
    configs = paymentConfigService,
    factory = providerFactory,
    orders = orderService,
    processor = paymentService,
    store = paymentRedisStore,
    paymentConfig = config.payment,
    eventBus,
  } = {}) {
    super({ name: 'payment.webhook', eventBus });
    this.webhooks = webhooks;
    this.payments = payments;
    this.intents = intents;
    this.configs = configs;
    this.factory = factory;
    this.orders = orders;
    this.processor = processor;
    this.store = store;
    this.paymentConfig = paymentConfig;
  }

  /**
   * @param {string} provider  'razorpay' | 'phonepe'
   * @param {{ rawBody: string, headers: object }} req
   */
  async handle(provider, { rawBody, headers = {} }) {
    if (!this.factory.isSupported(provider)) throw new BadRequestError(PAYMENT_ERRORS.PROVIDER_NOT_SUPPORTED);

    // 1) Parse WITHOUT credentials (JSON only) to learn the event id + refs.
    const parsed = this.factory.create(provider, {}).parseWebhook({ rawBody, headers });
    if (!parsed?.eventId) return { ignored: true, reason: 'no_event_id' };

    // 2) Idempotency / replay: durable record wins; Redis is the fast path.
    const existing = await this.webhooks.findByProviderEvent(provider, parsed.eventId);
    if (existing && existing.status === WEBHOOK_STATUS.PROCESSED) return { duplicate: true };
    await this.store.claimWebhook(provider, parsed.eventId, this.paymentConfig.webhook.dedupTtlSeconds);

    // 3) Resolve the owning order + tenant scope (payment first, else intent).
    const { order, scope, payment } = await this.#resolveTarget(parsed);
    if (!order || !scope) {
      await this.#record(provider, parsed, { signatureValid: false, status: WEBHOOK_STATUS.IGNORED });
      return { ignored: true, reason: 'unresolved' };
    }

    // 4) Load the restaurant's config (secrets) → verify the signature.
    const { provider: adapter } = await this.configs.resolveProvider(
      { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      provider,
    );
    const verify = adapter.verifyWebhook({ rawBody, headers });

    // 5) Durable webhook record (unique (provider,eventId) = replay backstop).
    let record;
    try {
      record = await this.#record(provider, parsed, {
        signatureValid: verify.valid,
        restaurantId: scope.restaurantId,
        paymentId: payment ? entityId(payment) : null,
        status: verify.valid ? WEBHOOK_STATUS.RECEIVED : WEBHOOK_STATUS.FAILED,
      });
    } catch (err) {
      if (err?.code === 11000) return { duplicate: true };
      throw err;
    }

    if (!verify.valid) {
      this.audit.failure('payment.webhook.invalid_signature', { targetId: entityId(record), metadata: { provider } });
      throw new ForbiddenError(PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID);
    }

    // 6) Apply idempotently via the payment orchestrator.
    await this.processor.applyWebhookResult({ scope, order, provider, adapter, parsed });
    await this.webhooks.markProcessed(entityId(record), { status: WEBHOOK_STATUS.PROCESSED });
    this.audit.success('payment.webhook.processed', { targetId: entityId(record), metadata: { provider, eventType: parsed.eventType } });
    return { processed: true };
  }

  async #resolveTarget(parsed) {
    const payment = parsed.providerPaymentRef ? await this.payments.findByProviderRef(parsed.providerPaymentRef) : null;
    if (payment) {
      const order = await this.orders.getByIdSystem(String(payment.orderId));
      return { order, scope: this.#scopeOf(payment), payment };
    }
    if (parsed.providerIntentRef) {
      const intent = await this.intents.findByProviderRef(parsed.providerIntentRef);
      if (intent) {
        const order = await this.orders.getByIdSystem(String(intent.orderId));
        return order ? { order, scope: { organizationId: String(order.organizationId), restaurantId: String(order.restaurantId), branchId: String(order.branchId) }, payment: null } : {};
      }
    }
    return {};
  }

  #scopeOf(p) {
    return { organizationId: String(p.organizationId), restaurantId: String(p.restaurantId), branchId: String(p.branchId) };
  }

  #record(provider, parsed, extra) {
    return this.webhooks.create({
      provider,
      eventId: parsed.eventId,
      eventType: parsed.eventType ?? null,
      ...extra,
    });
  }
}

export const webhookService = new WebhookService();
export default webhookService;
