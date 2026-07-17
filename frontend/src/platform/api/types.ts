/**
 * API Platform types. The client speaks these shapes so services + query hooks
 * are strongly typed end-to-end. Mirrors the backend's ApiResponse envelope.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Standard success envelope from the backend ApiResponse wrapper. */
export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = { items: T[]; meta: PaginationMeta };

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';

/** The normalized error every API failure resolves to (never a raw Response). */
export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number;
  code?: string;
  details?: unknown;
  /** Whether a retry could plausibly succeed (network/timeout/5xx/rate-limit). */
  retryable: boolean;

  constructor(params: { message: string; kind: ApiErrorKind; status?: number; code?: string; details?: unknown; retryable?: boolean }) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.status = params.status ?? 0;
    this.code = params.code;
    this.details = params.details;
    this.retryable = params.retryable ?? ['network', 'timeout', 'server', 'rate_limited'].includes(params.kind);
  }
}

export type RequestConfig = {
  method?: HttpMethod;
  /** JSON body (auto-serialized) OR FormData for uploads. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Per-request timeout override (ms). */
  timeoutMs?: number;
  /** Abort signal for cancellation (also cancel-on-unmount friendly). */
  signal?: AbortSignal;
  /** Skip the Authorization header (public endpoints). */
  skipAuth?: boolean;
  /**
   * Which credential to send when BOTH exist. Ordering endpoints (cart/orders/
   * session) authenticate by the GUEST session token even after the customer
   * signs in — their ordering identity IS the table session — so those services
   * pass 'guest'. Default 'auto' prefers the account access token.
   */
  auth?: 'auto' | 'guest';
  /** Retry policy override. */
  retries?: number;
  /** Treat this as an idempotent mutation that may be queued while offline. */
  offlineQueueable?: boolean;
  /** Upload progress callback (upload() only). */
  onUploadProgress?: (percent: number) => void;
  /** Override the API version segment for this call. */
  apiVersion?: string;
};

/** Pluggable auth adapter — set by the Auth Platform so API stays decoupled. */
export type AuthAdapter = {
  getAccessToken: () => string | null;
  getGuestToken: () => string | null;
  /** Attempt a token refresh; return true if a fresh token is now available. */
  refresh: () => Promise<boolean>;
  /** Called on an unrecoverable 401 (refresh failed) — auth platform logs out. */
  onUnauthorized: () => void;
};

/** Interceptors let cross-cutting concerns hook the pipeline without coupling. */
export type RequestInterceptor = (url: string, init: RequestInit) => void | RequestInit | Promise<void | RequestInit>;
export type ResponseInterceptor = (response: Response, url: string) => void | Promise<void>;
export type ErrorInterceptor = (error: ApiError) => void;
