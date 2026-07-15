import { redisConnection } from '#core/redis/redis.connection.js';

import { REDIS_KEYS } from '../constants/payment.constants.js';

/**
 * Redis store for the Payment Engine: idempotency (create-intent / confirm),
 * webhook DEDUP (fast-path replay guard, backed by the durable WebhookEvent
 * index), and temporary payment sessions (intent → checkout hand-off). Payment
 * LOCKS use the core distributedLock directly. No secrets are ever stored here.
 */
export class PaymentRedisStore {
  constructor(clientFactory = () => redisConnection.getClient()) {
    this.clientFactory = clientFactory;
  }

  get client() {
    return this.clientFactory();
  }

  // --- idempotency (per scope key) ---
  async getIdempotent(scopeKey, key) {
    if (!key) return null;
    const raw = await this.client.get(`${REDIS_KEYS.IDEMPOTENCY}:${scopeKey}:${key}`);
    return raw ? JSON.parse(raw) : null;
  }

  async setIdempotent(scopeKey, key, result, ttlSeconds) {
    if (!key) return;
    await this.client.set(`${REDIS_KEYS.IDEMPOTENCY}:${scopeKey}:${key}`, JSON.stringify(result), 'EX', ttlSeconds);
  }

  // --- webhook dedup (fast path) ---
  /** Atomically claim a webhook event id; returns true if this is the FIRST time. */
  async claimWebhook(provider, eventId, ttlSeconds) {
    const res = await this.client.set(`${REDIS_KEYS.WEBHOOK_DEDUP}:${provider}:${eventId}`, '1', 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }

  async releaseWebhook(provider, eventId) {
    return this.client.del(`${REDIS_KEYS.WEBHOOK_DEDUP}:${provider}:${eventId}`);
  }

  // --- temporary payment session (intent → checkout) ---
  async saveSession(intentId, data, ttlSeconds) {
    await this.client.set(`${REDIS_KEYS.PAYMENT_SESSION}:${intentId}`, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async getSession(intentId) {
    const raw = await this.client.get(`${REDIS_KEYS.PAYMENT_SESSION}:${intentId}`);
    return raw ? JSON.parse(raw) : null;
  }

  async delSession(intentId) {
    return this.client.del(`${REDIS_KEYS.PAYMENT_SESSION}:${intentId}`);
  }
}

export const paymentRedisStore = new PaymentRedisStore();
export default paymentRedisStore;
