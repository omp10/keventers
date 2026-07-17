import mongoose from 'mongoose';

import { branchService } from '#modules/organization/index.js';
import { guestTokenService } from '#modules/qr-ordering/index.js';
import { logger } from '#core/logging/logger.js';

import { JourneyEvent } from '../models/journey-event.model.js';

/**
 * JOURNEY SERVICE — ingests customer-journey events from the public sink and
 * serves the dashboard's per-customer journey views.
 *
 * Funnel depth per event: "how far did this visit get" is the question every
 * journey list answers, so it's stamped at ingest (a $max at read time) instead
 * of re-deriving it from event names on every dashboard load.
 */
const STAGE_OF = {
  qr_scanned: 1,
  outlet_identified: 1,
  otp_started: 2,
  otp_requested: 2,
  otp_succeeded: 2,
  registration_completed: 2,
  customer_recognized: 2,
  menu_loaded: 3,
  banner_clicked: 3,
  search_performed: 3,
  category_viewed: 3,
  subcategory_viewed: 3,
  product_viewed: 3,
  product_opened: 3,
  variant_selected: 3,
  addon_selected: 3,
  added_to_cart: 4,
  removed_from_cart: 4,
  cart_viewed: 4,
  impulse_item_added: 4,
  coupon_applied: 4,
  coupon_rejected: 4,
  checkout_started: 5,
  payment_started: 5,
  payment_failed: 5,
  payment_succeeded: 6,
  order_placed: 6,
  order_tracked: 7,
  order_status_changed: 7,
  order_collected: 7,
  feedback_submitted: 8,
};

export const STAGE_LABELS = ['—', 'Scanned', 'Verified', 'Browsed', 'Cart', 'Checkout', 'Ordered', 'Tracked', 'Feedback'];

class JourneyService {
  #log = logger({ module: 'analytics', component: 'journey' });
  /** slug → tenant ids; branches don't move tenants, so cache for the process. */
  #branchCache = new Map();

  async #tenantOfSlug(slug) {
    if (!slug) return null;
    if (this.#branchCache.has(slug)) return this.#branchCache.get(slug);
    try {
      const branch = await branchService.getPublicBySlug(slug);
      const tenant = branch
        ? {
            organizationId: branch.organizationId,
            restaurantId: branch.restaurantId,
            branchId: branch.id ?? branch._id,
          }
        : null;
      this.#branchCache.set(slug, tenant);
      return tenant;
    } catch {
      return null;
    }
  }

  /**
   * Ingest a batch from the customer app. `authorization` may carry the guest
   * session JWT — when it does, tenant + session identity come from the token
   * (trustworthy); otherwise the event's `outletSlug` resolves the tenant.
   */
  async ingest(events, { authorization } = {}) {
    let tokenCtx = null;
    const raw = (authorization ?? '').replace(/^Bearer\s+/i, '');
    if (raw) {
      try {
        const claims = guestTokenService.verify(raw);
        tokenCtx = {
          organizationId: claims.org ?? null,
          restaurantId: claims.rst ?? null,
          branchId: claims.brn ?? null,
          guestSessionId: claims.sid ?? null,
        };
      } catch {
        // An expired guest token must not lose the journey — fall back to slug.
      }
    }

    const docs = [];
    for (const e of events) {
      const outletSlug = e.properties?.outletSlug ?? null;
      const tenant = tokenCtx ?? (await this.#tenantOfSlug(outletSlug)) ?? {};
      docs.push({
        journeyId: e.journeyId,
        organizationId: tenant.organizationId ?? null,
        restaurantId: tenant.restaurantId ?? null,
        branchId: tenant.branchId ?? null,
        outletSlug,
        guestSessionId: tokenCtx?.guestSessionId ?? null,
        customerPhone: typeof e.properties?.phone === 'string' ? e.properties.phone : null,
        event: e.event,
        stage: STAGE_OF[e.event] ?? 0,
        properties: e.properties ?? {},
        at: e.at ? new Date(e.at) : new Date(),
      });
    }

    if (docs.length) {
      await JourneyEvent.insertMany(docs, { ordered: false }).catch((err) =>
        this.#log.warn({ err }, 'journey ingest partial failure'),
      );
    }
    return { accepted: docs.length };
  }

  /** Recent journeys for a restaurant (optionally one branch), newest first. */
  async listJourneys(restaurantId, { branchId = null, page = 1, limit = 25 } = {}) {
    // aggregate() does NOT auto-cast — a string restaurantId silently matches nothing.
    const oid = (v) => new mongoose.Types.ObjectId(String(v));
    const match = { restaurantId: oid(restaurantId) };
    if (branchId) match.branchId = oid(branchId);

    const skip = (Math.max(1, page) - 1) * limit;
    const rows = await JourneyEvent.aggregate([
      { $match: match },
      { $sort: { at: 1 } },
      {
        $group: {
          _id: '$journeyId',
          startedAt: { $first: '$at' },
          lastAt: { $last: '$at' },
          events: { $sum: 1 },
          stage: { $max: '$stage' },
          lastEvent: { $last: '$event' },
          outletSlug: { $last: '$outletSlug' },
          customerPhone: { $max: '$customerPhone' },
        },
      },
      { $sort: { lastAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    return rows.map((r) => ({
      journeyId: r._id,
      startedAt: r.startedAt,
      lastAt: r.lastAt,
      events: r.events,
      stage: r.stage,
      stageLabel: STAGE_LABELS[r.stage] ?? '—',
      lastEvent: r.lastEvent,
      outletSlug: r.outletSlug,
      customerPhone: r.customerPhone,
    }));
  }

  /** Full ordered timeline of one journey, scoped to the caller's restaurant. */
  async getJourney(restaurantId, journeyId) {
    const events = await JourneyEvent.find({ journeyId, restaurantId })
      .sort({ at: 1 })
      .limit(500)
      .lean();
    return events.map((e) => ({
      event: e.event,
      stage: e.stage,
      at: e.at,
      properties: e.properties ?? {},
      customerPhone: e.customerPhone,
      outletSlug: e.outletSlug,
    }));
  }
}

export const journeyService = new JourneyService();
export default journeyService;
