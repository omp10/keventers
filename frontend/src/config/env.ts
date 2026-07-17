/**
 * ENVIRONMENT PLATFORM — the single, typed source of runtime configuration.
 * Reads Vite `import.meta.env`, derives the deployment environment, and exposes
 * an immutable `env` object. NOTHING else in the app reads `import.meta.env`
 * directly — they import `env` here, so config is centralized and testable.
 */
export type AppEnvironment = 'development' | 'staging' | 'production' | 'preview';

function detectEnvironment(): AppEnvironment {
  const explicit = import.meta.env.VITE_APP_ENV as AppEnvironment | undefined;
  if (explicit && ['development', 'staging', 'production', 'preview'].includes(explicit)) return explicit;
  if (import.meta.env.DEV) return 'development';
  // Preview deployments (Vercel/Netlify) set a host that isn't the prod domain.
  if (typeof location !== 'undefined' && /(?:^|\.)(?:preview|staging|vercel\.app|netlify\.app)/.test(location.hostname)) {
    return 'preview';
  }
  return 'production';
}

const environment = detectEnvironment();

const flag = (v: string | undefined, fallback = false) => (v == null ? fallback : v === 'true' || v === '1');
const apiBaseUrl = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';

function apiOrigin(baseUrl: string): string {
  if (typeof location === 'undefined') return '';
  try {
    return new URL(baseUrl, location.origin).origin;
  } catch {
    return location.origin;
  }
}

export const env = {
  environment,
  isDev: environment === 'development',
  isProd: environment === 'production',
  /** Non-prod environments show the environment banner + verbose diagnostics. */
  isNonProd: environment !== 'production',

  api: {
    baseUrl: apiBaseUrl,
    version: (import.meta.env.VITE_API_VERSION as string) ?? 'v1',
    timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 20000),
  },
  socket: {
    // The API and Socket.IO server share an origin in production. Deriving this
    // prevents Vercel from accidentally attempting sockets against its own host.
    url: (import.meta.env.VITE_SOCKET_URL as string) || apiOrigin(apiBaseUrl),
    path: (import.meta.env.VITE_SOCKET_PATH as string) ?? '/socket.io',
    enabled: flag(import.meta.env.VITE_SOCKET_ENABLED as string, true),
  },
  maps: {
    apiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ?? '',
    defaultCenter: { lat: 28.6139, lng: 77.209 }, // New Delhi
    defaultZoom: 13,
  },
  analytics: {
    enabled: flag(import.meta.env.VITE_ANALYTICS_ENABLED as string, environment === 'production'),
    writeKey: (import.meta.env.VITE_ANALYTICS_WRITE_KEY as string) ?? '',
    /**
     * Microsoft Clarity project id. Empty = Clarity is simply not loaded, which
     * is the correct default: no id means no third party receives session data.
     */
    clarityProjectId: (import.meta.env.VITE_CLARITY_PROJECT_ID as string) ?? '',
  },
  /** Build-time feature-flag defaults; the flag platform can override at runtime. */
  featureDefaults: {
    payments: flag(import.meta.env.VITE_FF_PAYMENTS as string, true),
    loyalty: flag(import.meta.env.VITE_FF_LOYALTY as string, true),
    notifications: flag(import.meta.env.VITE_FF_NOTIFICATIONS as string, true),
    qrOrdering: flag(import.meta.env.VITE_FF_QR as string, true),
    discovery: flag(import.meta.env.VITE_FF_DISCOVERY as string, true),
    maps: flag(import.meta.env.VITE_FF_MAPS as string, true),
    analytics: flag(import.meta.env.VITE_FF_ANALYTICS as string, true),
    kitchen: flag(import.meta.env.VITE_FF_KITCHEN as string, true),
    experimental: flag(import.meta.env.VITE_FF_EXPERIMENTAL as string, false),
  },
  build: {
    version: (import.meta.env.VITE_APP_VERSION as string) ?? '0.0.0',
    commit: (import.meta.env.VITE_COMMIT_SHA as string) ?? 'dev',
  },
} as const;

export type Env = typeof env;
