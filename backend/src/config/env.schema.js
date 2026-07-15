import { z } from 'zod';

/**
 * Canonical schema for every environment variable the platform consumes.
 * This is the ONLY place raw env shapes are declared. Parsing happens once,
 * at boot, and fails fast with a readable message if anything is invalid.
 */
export const envSchema = z.object({
  // --- Server ---
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().startsWith('/').default('/api'),
  BODY_LIMIT: z.string().default('1mb'),
  CORS_ORIGIN: z.string().default('*'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(10000),

  // --- MongoDB ---
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_DB_NAME: z.string().min(1).default('keventers'),
  MONGO_MAX_POOL_SIZE: z.coerce.number().int().positive().default(10),
  MONGO_MIN_POOL_SIZE: z.coerce.number().int().nonnegative().default(2),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // --- Redis ---
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  REDIS_KEY_PREFIX: z.string().default('keventers:'),

  // --- JWT (wiring only; consumed by future identity module) ---
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('keventers-platform'),
  JWT_AUDIENCE: z.string().default('keventers-clients'),

  // --- Logging ---
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LOG_PRETTY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // --- Swagger ---
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SWAGGER_ROUTE: z.string().startsWith('/').default('/docs'),

  // --- Auth / Session ---
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  AUTH_MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(300),

  // --- QR Ordering / Guest sessions ---
  // Server-side secret for signing QR tokens (tamper detection). Falls back to
  // the JWT access secret when unset so a fresh install still works securely.
  QR_TOKEN_SECRET: z.string().min(16).optional(),
  // Public base URL the physical QR image points to (the customer scan landing).
  QR_PUBLIC_BASE_URL: z.string().default('http://localhost:4000/scan'),
  // Guest ordering session lifetimes.
  GUEST_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(7200), // 2h hard cap
  GUEST_SESSION_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(1800), // 30m idle
  GUEST_TOKEN_EXPIRES_IN: z.string().default('2h'),
  // Fixed-window rate limit for the public QR scan endpoint (per IP).
  QR_SCAN_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  QR_SCAN_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  // --- Cart & Pricing (Phase 4.5) ---
  CART_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(3600), // 1h inactivity
  CART_IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86400), // 24h
  CART_LOCK_TTL_MS: z.coerce.number().int().positive().default(5000),
  CART_MAX_ITEMS: z.coerce.number().int().positive().default(100),

  // --- Payments (Phase 4.8) ---
  PAYMENT_INTENT_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 min
  PAYMENT_LOCK_TTL_MS: z.coerce.number().int().positive().default(8000),
  PAYMENT_WEBHOOK_TTL_SECONDS: z.coerce.number().int().positive().default(172800), // 48h dedup
  PAYMENT_WEBHOOK_REPLAY_WINDOW_SECONDS: z.coerce.number().int().positive().default(300), // 5 min
  PAYMENT_IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  // --- Customer & Loyalty (Phase 4.9) ---
  LOYALTY_EARN_POINTS_PER_CURRENCY_UNIT: z.coerce.number().positive().default(1), // points per major currency unit spent
  LOYALTY_POINTS_EXPIRY_DAYS: z.coerce.number().int().positive().default(365),
  LOYALTY_SIGNUP_BONUS_POINTS: z.coerce.number().int().min(0).default(0),
  LOYALTY_TIER_SILVER_POINTS: z.coerce.number().int().min(0).default(1000),
  LOYALTY_TIER_GOLD_POINTS: z.coerce.number().int().min(0).default(5000),
  LOYALTY_TIER_PLATINUM_POINTS: z.coerce.number().int().min(0).default(15000),
  CUSTOMER_PROFILE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  CUSTOMER_LOYALTY_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  CUSTOMER_REWARDS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  CUSTOMER_LOCK_TTL_MS: z.coerce.number().int().positive().default(8000),
  CUSTOMER_FAVORITE_PRODUCTS_LIMIT: z.coerce.number().int().positive().default(10),
  CUSTOMER_TIMELINE_LIMIT: z.coerce.number().int().positive().default(50),
  REFERRAL_REWARD_POINTS: z.coerce.number().int().min(0).default(200),

  // --- Notifications (Phase 4.10) ---
  NOTIFY_EMAIL_PROVIDER: z.enum(['smtp', 'resend']).default('smtp'),
  NOTIFY_SMS_PROVIDER: z.enum(['twilio']).default('twilio'),
  NOTIFY_WHATSAPP_PROVIDER: z.enum(['meta']).default('meta'),
  NOTIFY_PUSH_PROVIDER: z.enum(['fcm']).default('fcm'),
  NOTIFY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  NOTIFY_BACKOFF_MS: z.coerce.number().int().positive().default(2000),
  NOTIFY_DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(10),
  NOTIFY_RELAY_CRON: z.string().default('*/1 * * * *'), // every minute
  NOTIFY_RELAY_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  NOTIFY_OUTBOX_STALE_SECONDS: z.coerce.number().int().positive().default(60),
  NOTIFY_DEDUPE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  NOTIFY_LOCK_TTL_MS: z.coerce.number().int().positive().default(10000),
  NOTIFY_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  NOTIFY_EMAIL_FROM_NAME: z.string().default('Keventers'),
  NOTIFY_EMAIL_FROM_ADDRESS: z.string().default('no-reply@keventers.example'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  META_WA_PHONE_NUMBER_ID: z.string().optional(),
  META_WA_ACCESS_TOKEN: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_SERVER_KEY: z.string().optional(),

  // --- Analytics (Phase 4.11) ---
  ANALYTICS_DASHBOARD_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  ANALYTICS_KPI_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),
  ANALYTICS_TRENDING_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  ANALYTICS_PREP_CORRELATION_TTL_SECONDS: z.coerce.number().int().positive().default(21600), // 6h
  ANALYTICS_REBUILD_BATCH_SIZE: z.coerce.number().int().positive().default(500),
  ANALYTICS_RECONCILE_CRON: z.string().default('0 3 * * *'), // daily 03:00
  ANALYTICS_RECONCILE_TOLERANCE_MINOR: z.coerce.number().int().min(0).default(100), // ₹1.00
  ANALYTICS_SCOPE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  // --- Security ---
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be >= 32 chars').optional(),
  API_KEY_PEPPER: z.string().min(16).optional(),

  // --- File Storage ---
  STORAGE_DRIVER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  STORAGE_PUBLIC_BASE_URL: z.string().default('http://localhost:4000/static'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),

  // --- Socket.IO ---
  SOCKET_PATH: z.string().startsWith('/').default('/socket.io'),
  SOCKET_CORS_ORIGIN: z.string().default('*'),
  SOCKET_REDIS_ADAPTER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // --- Background Jobs / Queue ---
  QUEUE_PREFIX: z.string().default('keventers:jobs'),
  QUEUE_DEFAULT_ATTEMPTS: z.coerce.number().int().positive().default(3),
  QUEUE_DEFAULT_BACKOFF_MS: z.coerce.number().int().nonnegative().default(2000),
  QUEUE_REMOVE_ON_COMPLETE: z.coerce.number().int().nonnegative().default(1000),
  QUEUE_REMOVE_ON_FAIL: z.coerce.number().int().nonnegative().default(5000),

  // --- Event Bus ---
  EVENT_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  EVENT_RETRY_BACKOFF_MS: z.coerce.number().int().nonnegative().default(200),

  // --- Observability ---
  METRICS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  METRICS_ROUTE: z.string().startsWith('/').default('/metrics'),

  // --- Platform Seed / Bootstrap Admin ---
  // Optional at the process level (the server boots without them); the identity
  // seeder validates their presence when it actually runs.
  PLATFORM_ADMIN_NAME: z.string().min(1).optional(),
  PLATFORM_ADMIN_EMAIL: z.string().email().optional(),
  PLATFORM_ADMIN_PASSWORD: z.string().min(8).optional(),
  PLATFORM_ADMIN_PHONE: z.string().optional(),
  SEED_DEFAULT_ORG_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SEED_DEFAULT_ORG_NAME: z.string().default('Keventers'),
})
  // PRODUCTION-CONDITIONAL STRICTNESS — the app must fail FAST at boot (never
  // fail-late at first use, never boot with an insecure default) when a
  // security-critical secret is missing or a permissive default is left in
  // place in production. Non-prod keeps the friendly developer defaults.
  .superRefine((v, ctx) => {
    if (v.NODE_ENV !== 'production') return;
    const require = (field, message) => {
      if (!v[field]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    };
    require('ENCRYPTION_KEY', 'ENCRYPTION_KEY is required in production (payment-credential encryption)');
    require('API_KEY_PEPPER', 'API_KEY_PEPPER is required in production (API-key hashing pepper)');
    // Wildcard CORS with credentials is unsafe in production — demand an allowlist.
    if (v.CORS_ORIGIN === '*') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['CORS_ORIGIN'], message: 'CORS_ORIGIN must be an explicit origin allowlist in production (not "*")' });
    if (v.SOCKET_CORS_ORIGIN === '*') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SOCKET_CORS_ORIGIN'], message: 'SOCKET_CORS_ORIGIN must be an explicit origin allowlist in production (not "*")' });
  });

/**
 * Parse & validate a raw env object.
 * @param {NodeJS.ProcessEnv} rawEnv
 * @returns {z.infer<typeof envSchema>}
 */
export function validateEnv(rawEnv) {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    // Process cannot start with invalid config — fail loudly and exit.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}
