import { NotFoundError, ValidationError } from '#core/errors/app-error.js';

import { SubscriptionPlan, SUBSCRIPTION_PLAN_STATUS } from '../models/subscription-plan.model.js';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/subscription.model.js';

/**
 * SUBSCRIPTION SERVICE — plans are admin-authored data (dashboard CMS); the
 * customer app lists active plans and purchases one. Settlement is at the
 * counter for now: a purchase starts `pending_payment` and staff activate it
 * from the dashboard, which stamps the period window.
 */
const scopeOf = (t) => ({ organizationId: t.organizationId, restaurantId: t.restaurantId });
// Query filter: restaurantId is globally unique, so it alone scopes a read —
// and a super-admin (who carries no organizationId) can still match.
const matchOf = (t) => ({ restaurantId: t.restaurantId });

class SubscriptionService {
  /* ── plans (management) ── */

  async listPlans(tenant, { includeArchived = false } = {}) {
    const q = { ...matchOf(tenant), deletedAt: null };
    if (!includeArchived) q.status = SUBSCRIPTION_PLAN_STATUS.ACTIVE;
    const plans = await SubscriptionPlan.find(q).sort({ displayOrder: 1, createdAt: 1 }).lean({ virtuals: true });
    // Subscriber counts in one query, not one per plan.
    const counts = await Subscription.aggregate([
      { $match: { restaurantId: plans[0]?.restaurantId ?? null, status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.PENDING_PAYMENT] } } },
      { $group: { _id: '$planId', n: { $sum: 1 } } },
    ]);
    const byPlan = new Map(counts.map((c) => [String(c._id), c.n]));
    return plans.map((p) => ({ ...p, id: String(p._id), subscribers: byPlan.get(String(p._id)) ?? 0 }));
  }

  async createPlan(tenant, data, _actorId = null) {
    let { organizationId } = tenant;
    // Super-admin scopes by restaurantId alone and carries no org — resolve it
    // from the restaurant so the plan is stamped with a valid tenant.
    if (!organizationId && tenant.restaurantId) {
      const { restaurantService } = await import('#modules/organization/index.js');
      const restaurant = await restaurantService.getPublicProfile(tenant.restaurantId);
      organizationId = restaurant?.organizationId ?? null;
    }
    const plan = await SubscriptionPlan.create({ organizationId, restaurantId: tenant.restaurantId, ...data });
    return plan.toJSON();
  }

  async updatePlan(tenant, id, patch) {
    const plan = await SubscriptionPlan.findOneAndUpdate(
      { _id: id, ...matchOf(tenant), deletedAt: null },
      { $set: patch },
      { new: true },
    );
    if (!plan) throw new NotFoundError('Subscription plan not found');
    return plan.toJSON();
  }

  async archivePlan(tenant, id) {
    return this.updatePlan(tenant, id, { status: SUBSCRIPTION_PLAN_STATUS.ARCHIVED });
  }

  /* ── customer side ── */

  /** Active plans, public shape (no tenant internals). */
  async listPublicPlans(tenant) {
    const plans = await SubscriptionPlan.find({ ...matchOf(tenant), status: SUBSCRIPTION_PLAN_STATUS.ACTIVE, deletedAt: null })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean({ virtuals: true });
    return plans.map((p) => ({
      id: String(p._id),
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      periodDays: p.periodDays,
      itemQuota: p.itemQuota,
      perks: p.perks,
    }));
  }

  async subscribe(tenant, { customerId, userId }, planId) {
    const plan = await SubscriptionPlan.findOne({ _id: planId, ...matchOf(tenant), status: SUBSCRIPTION_PLAN_STATUS.ACTIVE, deletedAt: null });
    if (!plan) throw new NotFoundError('Subscription plan not found');
    const existing = await Subscription.findOne({
      customerId,
      planId,
      status: { $in: [SUBSCRIPTION_STATUS.PENDING_PAYMENT, SUBSCRIPTION_STATUS.ACTIVE] },
    });
    if (existing) throw new ValidationError('You already have this subscription');

    const sub = await Subscription.create({
      ...scopeOf(tenant),
      planId,
      customerId,
      userId: userId ?? null,
      planName: plan.name,
      pricePaid: plan.price,
      currency: plan.currency,
      itemQuota: plan.itemQuota,
      status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
    });
    return sub.toJSON();
  }

  async listForCustomer(customerId) {
    const subs = await Subscription.find({ customerId }).sort({ createdAt: -1 }).limit(20).lean({ virtuals: true });
    return subs.map((s) => ({ ...s, id: String(s._id) }));
  }

  /* ── management over subscribers ── */

  async listSubscribers(tenant, { status, page = 1, limit = 25 } = {}) {
    const q = { ...matchOf(tenant) };
    if (status) q.status = status;
    const subs = await Subscription.find(q)
      .sort({ createdAt: -1 })
      .skip((Math.max(1, page) - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name phone email')
      .lean({ virtuals: true });
    return subs.map((s) => ({ ...s, id: String(s._id), customer: s.customerId, customerId: String(s.customerId?._id ?? s.customerId) }));
  }

  /** Staff settles payment at the counter → the period starts NOW. */
  async activate(tenant, id) {
    const sub = await Subscription.findOne({ _id: id, ...matchOf(tenant) });
    if (!sub) throw new NotFoundError('Subscription not found');
    const plan = await SubscriptionPlan.findById(sub.planId);
    const now = new Date();
    sub.status = SUBSCRIPTION_STATUS.ACTIVE;
    sub.startedAt = now;
    sub.expiresAt = new Date(now.getTime() + (plan?.periodDays ?? 30) * 24 * 3600 * 1000);
    await sub.save();
    return sub.toJSON();
  }

  async cancel(tenant, id) {
    const sub = await Subscription.findOneAndUpdate(
      { _id: id, ...matchOf(tenant) },
      { $set: { status: SUBSCRIPTION_STATUS.CANCELLED } },
      { new: true },
    );
    if (!sub) throw new NotFoundError('Subscription not found');
    return sub.toJSON();
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
