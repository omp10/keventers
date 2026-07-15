import { BaseRepository } from '#core/repository/base.repository.js';

import { WebhookEvent } from '../models/webhook-event.model.js';

/**
 * Webhook-event repository — the durable dedup/replay ledger. Not tenant-scoped
 * (webhooks arrive on a global endpoint; the restaurant is resolved from the
 * referenced payment). The unique (provider, eventId) index is the persistent
 * idempotency guarantee behind the Redis fast-path.
 */
export class WebhookRepository extends BaseRepository {
  constructor(model = WebhookEvent) {
    super(model, { softDelete: false });
  }

  findByProviderEvent(provider, eventId) {
    return this.findOne({ provider, eventId });
  }

  markProcessed(id, patch) {
    return this.updateById(id, { ...patch, processedAt: new Date() });
  }
}

export const webhookRepository = new WebhookRepository();
export default webhookRepository;
