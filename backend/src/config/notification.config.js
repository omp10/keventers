/**
 * Notification Engine configuration. Selects the ACTIVE provider per channel
 * (interchangeable) and holds delivery reliability knobs (retries, backoff, rate
 * limits, TTLs). Provider CREDENTIALS come from env but are only read by the
 * provider adapters. Missing credentials simply leave a channel "not ready" —
 * the engine degrades gracefully (in-app always works).
 *
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildNotificationConfig(env) {
  return {
    // Which concrete provider each channel uses.
    providers: {
      email: env.NOTIFY_EMAIL_PROVIDER, // 'smtp' | 'resend'
      sms: env.NOTIFY_SMS_PROVIDER, // 'twilio'
      whatsapp: env.NOTIFY_WHATSAPP_PROVIDER, // 'meta'
      push: env.NOTIFY_PUSH_PROVIDER, // 'fcm'
    },
    delivery: {
      maxAttempts: env.NOTIFY_MAX_ATTEMPTS,
      backoffMs: env.NOTIFY_BACKOFF_MS,
      concurrency: env.NOTIFY_DELIVERY_CONCURRENCY,
      relayCron: env.NOTIFY_RELAY_CRON,
      relayBatchSize: env.NOTIFY_RELAY_BATCH_SIZE,
      outboxStaleSeconds: env.NOTIFY_OUTBOX_STALE_SECONDS,
    },
    redis: {
      dedupeTtlSeconds: env.NOTIFY_DEDUPE_TTL_SECONDS,
      lockTtlMs: env.NOTIFY_LOCK_TTL_MS,
      rateLimitPerMinute: env.NOTIFY_RATE_LIMIT_PER_MINUTE,
    },
    // Non-secret sender identity + provider endpoints/creds (read by adapters).
    email: {
      fromName: env.NOTIFY_EMAIL_FROM_NAME,
      fromAddress: env.NOTIFY_EMAIL_FROM_ADDRESS,
      smtp: { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, pass: env.SMTP_PASS, secure: env.SMTP_SECURE },
      resend: { apiKey: env.RESEND_API_KEY },
    },
    sms: { twilio: { accountSid: env.TWILIO_ACCOUNT_SID, authToken: env.TWILIO_AUTH_TOKEN, from: env.TWILIO_FROM } },
    whatsapp: { meta: { phoneNumberId: env.META_WA_PHONE_NUMBER_ID, accessToken: env.META_WA_ACCESS_TOKEN } },
    push: { fcm: { projectId: env.FCM_PROJECT_ID, serverKey: env.FCM_SERVER_KEY } },
  };
}
