import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';
import { Money } from '#modules/pricing/index.js';

import {
  PAYMENT_ERRORS,
  PAYMENT_STATUS,
  SETTLEMENT_STATUS,
} from '../constants/payment.constants.js';
import { toSettlementDTO } from '../dto/payment.dto.js';
import {
  SettlementCompletedEvent,
  SettlementCreatedEvent,
} from '../events/payment.events.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { settlementRepository } from '../repositories/settlement.repository.js';
import { entityId } from '../utils/id.util.js';
import { loadForStaff, resolveStaffScope } from '../utils/tenant.util.js';

/**
 * Settlement ABSTRACTION. Groups CAPTURED payments over a period and computes
 * gross / commission / taxes / net using the Money value object (integer minor
 * units — never floats). It performs NO real payout — a future
 * SettlementProvider executes that via its interface. Restaurant + platform
 * settlements share this aggregate; the commission/tax rates are inputs.
 */
export class SettlementService extends BaseService {
  constructor({
    settlements = settlementRepository,
    payments = paymentRepository,
    resolveScope = resolveStaffScope,
    eventBus,
  } = {}) {
    super({ name: 'payment.settlement', eventBus });
    this.settlements = settlements;
    this.payments = payments;
    this.resolveScope = resolveScope;
  }

  /**
   * Create a settlement for a period. commissionBps/taxBps are basis points.
   * gross = Σ captured; commission = gross × commissionBps; tax = commission ×
   * taxBps; net = gross − commission − tax.
   */
  async createSettlement(tenant, restaurantId, { periodStart, periodEnd, provider = null, commissionBps = 0, taxBps = 0 } = {}, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const captured = await this.payments.findScoped(scope, {
      status: { $in: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
      createdAt: { $gte: start, $lte: end },
    });

    const currency = captured[0]?.currency ?? 'INR';
    const gross = Money.of(captured.reduce((s, p) => s + (p.amount - (p.refundedAmount ?? 0)), 0), currency);
    const commission = gross.percentageBps(Math.trunc(commissionBps));
    const tax = commission.percentageBps(Math.trunc(taxBps));
    const net = gross.subtract(commission).subtract(tax);

    const settlement = await this.settlements.createScoped(scope, {
      provider,
      periodStart: start,
      periodEnd: end,
      grossAmount: gross.amount,
      commissionAmount: commission.amount,
      taxAmount: tax.amount,
      netAmount: net.amount,
      currency,
      paymentIds: captured.map((p) => p.id ?? p._id),
      paymentCount: captured.length,
      status: SETTLEMENT_STATUS.PENDING,
    });
    await this.events.publish(
      new SettlementCreatedEvent({ settlementId: entityId(settlement), restaurantId: scope.restaurantId, netAmount: net.amount, paymentCount: captured.length }),
    );
    this.audit.success('payment.settlement.created', { actorId, targetId: entityId(settlement), metadata: { net: net.amount } });
    return toSettlementDTO(settlement);
  }

  async listSettlements(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.status) filter.status = query.status;
    const page = await this.settlements.paginateForStaff(scope, {
      filter,
      sort: query.sort ?? '-periodEnd',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toSettlementDTO);
  }

  async getSettlement(tenant, id) {
    const s = await loadForStaff(this.settlements, tenant, id, PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    return toSettlementDTO(s);
  }

  /** Mark a settlement completed (payout executed by an external provider). */
  async completeSettlement(tenant, id, { reference = null } = {}, actorId = null) {
    const s = await loadForStaff(this.settlements, tenant, id, PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    if (!s) throw new NotFoundError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    const updated = await this.settlements.updateById(id, { status: SETTLEMENT_STATUS.COMPLETED, reference, completedAt: new Date() });
    await this.events.publish(new SettlementCompletedEvent({ settlementId: String(id), restaurantId: String(s.restaurantId) }));
    this.audit.success('payment.settlement.completed', { actorId, targetId: String(id) });
    return toSettlementDTO(updated);
  }
}

export const settlementService = new SettlementService();
export default settlementService;
