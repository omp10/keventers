import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ConflictError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { Money } from '#modules/pricing/index.js';

import {
  PAYMENT_ERRORS,
  PAYMENT_STATUS,
  REDIS_KEYS,
  REFUND_STATUS,
  SOCKET_EVENTS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../constants/payment.constants.js';
import { toRefundDTO } from '../dto/payment.dto.js';
import {
  RefundCompletedEvent,
  RefundFailedEvent,
  RefundRequestedEvent,
} from '../events/payment.events.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { refundRepository } from '../repositories/refund.repository.js';
import { entityId } from '../utils/id.util.js';
import { refundReference } from '../utils/reference.util.js';
import { loadForStaff, resolveStaffScope } from '../utils/tenant.util.js';

import { paymentConfigService } from './payment-config.service.js';
import { paymentRealtimeService } from './payment-realtime.service.js';
import { transactionService } from './transaction.service.js';

/**
 * Refund service. Full or partial refunds of a captured payment. Refund
 * EXECUTION is delegated to the provider adapter; this service owns the
 * lifecycle, enforces that total refunds never exceed the captured amount
 * (duplicate-refund prevention), records the immutable ledger, and updates the
 * payment's refunded amount + status. Integer minor units.
 */
export class RefundService extends BaseService {
  constructor({
    refunds = refundRepository,
    payments = paymentRepository,
    transactions = transactionService,
    configs = paymentConfigService,
    realtime = paymentRealtimeService,
    resolveScope = resolveStaffScope,
    lock = distributedLock,
    eventBus,
  } = {}) {
    super({ name: 'payment.refund', eventBus });
    this.refunds = refunds;
    this.payments = payments;
    this.transactions = transactions;
    this.configs = configs;
    this.realtime = realtime;
    this.resolveScope = resolveScope;
    this.lock = lock;
  }

  #scopeOf(p) {
    return { organizationId: String(p.organizationId), restaurantId: String(p.restaurantId), branchId: String(p.branchId) };
  }

  /**
   * Request a refund (full or partial). Staff/admin only. Idempotent by key +
   * guarded so cumulative refunds never exceed the captured amount.
   */
  async requestRefund(tenant, { paymentId, amount = null, reason = '', idempotencyKey = null } = {}, actorId = null) {
    const payment = await loadForStaff(this.payments, tenant, paymentId, PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    if (![PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.PARTIALLY_REFUNDED].includes(payment.status)) {
      throw new BadRequestError(PAYMENT_ERRORS.NOT_REFUNDABLE);
    }
    const scope = this.#scopeOf(payment);
    const currency = payment.currency ?? 'INR';

    return this.lock.withLock(
      `${REDIS_KEYS.PAYMENT_LOCK}:refund:${paymentId}`,
      async () => {
        const priorByKey = await this.refunds.findByPaymentAndKey(paymentId, idempotencyKey);
        if (priorByKey) return toRefundDTO(priorByKey);

        const alreadyRefunded = Money.of(await this.refunds.sumActiveForPayment(paymentId), currency);
        const captured = Money.of(payment.amount, currency);
        const refundable = captured.subtract(alreadyRefunded).max(Money.zero(currency));
        const amt = amount != null ? Money.of(Math.trunc(amount), currency) : refundable;
        if (amt.isZero() || amt.amount > refundable.amount) throw new ConflictError(PAYMENT_ERRORS.DUPLICATE_REFUND);
        const isPartial = amt.amount < captured.amount;

        let refund = await this.refunds.createScoped(scope, {
          orderId: payment.orderId,
          paymentId,
          amount: amt.amount,
          currency,
          isPartial,
          provider: payment.provider,
          status: REFUND_STATUS.REQUESTED,
          reason,
          requestedBy: actorId,
          idempotencyKey,
          timeline: [{ at: new Date(), status: REFUND_STATUS.REQUESTED, actorId, reason }],
        });
        await this.events.publish(new RefundRequestedEvent({ refundId: entityId(refund), paymentId, orderId: String(payment.orderId), amount: amt.amount, restaurantId: scope.restaurantId }));
        this.audit.success('payment.refund_requested', { actorId, targetId: entityId(refund), metadata: { amount: amt.amount } });

        // Execute via the provider (or mark completed for manual/cash payments).
        try {
          let providerRefundRef = null;
          let status = REFUND_STATUS.COMPLETED;
          if (payment.provider && payment.providerPaymentRef) {
            const { provider: adapter } = await this.configs.resolveProvider(
              { organizationId: scope.organizationId, restaurantId: scope.restaurantId },
              payment.provider,
            );
            const res = await adapter.refundPayment({
              providerPaymentRef: payment.providerPaymentRef,
              amount: amt.amount,
              currency,
              merchantRefundId: refundReference(payment.providerPaymentRef),
              idempotencyKey: idempotencyKey ?? undefined,
            });
            providerRefundRef = res.providerRefundRef;
            status = res.status === 'completed' ? REFUND_STATUS.COMPLETED : REFUND_STATUS.PROCESSING;
          }

          refund = await this.refunds.updateWithVersion(entityId(refund), refund.version, {
            status,
            providerRefundRef,
            completedAt: status === REFUND_STATUS.COMPLETED ? new Date() : null,
          }, { push: { timeline: { at: new Date(), status } } });

          // Immutable ledger + payment refunded-amount update.
          await this.transactions.record(scope, { orderId: String(payment.orderId), paymentId, refundId: entityId(refund), type: TRANSACTION_TYPE.REFUND, amount: amt.amount, currency, provider: payment.provider, status: TRANSACTION_STATUS.SUCCESS, providerTxnId: providerRefundRef });

          const newRefunded = alreadyRefunded.add(amt);
          const paymentStatus = newRefunded.amount >= captured.amount ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
          await this.payments.updateWithVersion(paymentId, payment.version, { refundedAmount: newRefunded.amount, status: paymentStatus });

          if (status === REFUND_STATUS.COMPLETED) {
            await this.events.publish(new RefundCompletedEvent({ refundId: entityId(refund), paymentId, orderId: String(payment.orderId), amount: amt.amount, restaurantId: scope.restaurantId }));
            this.realtime.emit({ ...payment, status: paymentStatus }, SOCKET_EVENTS.REFUND_COMPLETED, { refundId: entityId(refund), refundAmount: amt.amount });
          }
          this.audit.success('payment.refund_completed', { actorId, targetId: entityId(refund), metadata: { status } });
          return toRefundDTO(refund);
        } catch (err) {
          const failed = await this.refunds.updateWithVersion(entityId(refund), refund.version, { status: REFUND_STATUS.FAILED, failureReason: err.message }, { push: { timeline: { at: new Date(), status: REFUND_STATUS.FAILED } } });
          await this.events.publish(new RefundFailedEvent({ refundId: entityId(refund), paymentId, reason: err.message }));
          this.audit.failure('payment.refund_failed', { actorId, targetId: entityId(refund), metadata: { reason: err.message } });
          return toRefundDTO(failed);
        }
      },
      { ttlMs: 8000 },
    );
  }

  async listForStaff(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.paymentId) filter.paymentId = query.paymentId;
    const page = await this.refunds.paginateForStaff(scope, {
      filter,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toRefundDTO);
  }

  async getForStaff(tenant, id) {
    const refund = await loadForStaff(this.refunds, tenant, id, PAYMENT_ERRORS.REFUND_NOT_FOUND);
    return toRefundDTO(refund);
  }
}

export const refundService = new RefundService();
export default refundService;
