import { env } from '@/config/env';

import { errorFromResponse, toApiError } from './error-mapping';
import {
  ApiError,
  type ApiEnvelope,
  type AuthAdapter,
  type ErrorInterceptor,
  type Paginated,
  type RequestConfig,
  type RequestInterceptor,
  type ResponseInterceptor,
} from './types';

const noopAuth: AuthAdapter = {
  getAccessToken: () => null,
  getGuestToken: () => null,
  refresh: async () => false,
  onUnauthorized: () => {},
};

/**
 * API PLATFORM — the ONE HTTP client. Components/services NEVER call fetch/axios
 * directly; they go through this (or the query hooks that wrap it). Provides:
 * interceptors, injected auth + single-flight token refresh on 401, retry with
 * backoff, per-request timeout + cancellation, error normalization, offline
 * queueing, versioning and env-driven base URL. Decoupled from Auth/Offline via
 * injected adapters (no import cycles).
 */
export class ApiClient {
  private baseUrl: string;
  private version: string;
  private timeoutMs: number;
  private auth: AuthAdapter = noopAuth;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private isOnline: () => boolean = () => (typeof navigator === 'undefined' ? true : navigator.onLine);
  private enqueueOffline: ((req: { method: string; path: string; config: RequestConfig }) => void) | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(opts?: { baseUrl?: string; version?: string; timeoutMs?: number }) {
    this.baseUrl = opts?.baseUrl ?? env.api.baseUrl;
    this.version = opts?.version ?? env.api.version;
    this.timeoutMs = opts?.timeoutMs ?? env.api.timeoutMs;
  }

  /* ── configuration (set by the platform providers) ── */
  setAuthAdapter(adapter: AuthAdapter) { this.auth = adapter; }
  setOnlineChecker(fn: () => boolean) { this.isOnline = fn; }
  setOfflineQueue(fn: (req: { method: string; path: string; config: RequestConfig }) => void) { this.enqueueOffline = fn; }
  addRequestInterceptor(i: RequestInterceptor) { this.requestInterceptors.push(i); }
  addResponseInterceptor(i: ResponseInterceptor) { this.responseInterceptors.push(i); }
  addErrorInterceptor(i: ErrorInterceptor) { this.errorInterceptors.push(i); }
  /** Point the client at a different API version/environment at runtime. */
  configure(opts: { baseUrl?: string; version?: string }) {
    if (opts.baseUrl) this.baseUrl = opts.baseUrl;
    if (opts.version) this.version = opts.version;
  }

  /* ── verbs ── */
  get<T>(path: string, config: RequestConfig = {}) { return this.request<T>(path, { ...config, method: 'GET' }); }
  post<T>(path: string, body?: unknown, config: RequestConfig = {}) { return this.request<T>(path, { ...config, method: 'POST', body }); }
  put<T>(path: string, body?: unknown, config: RequestConfig = {}) { return this.request<T>(path, { ...config, method: 'PUT', body }); }
  patch<T>(path: string, body?: unknown, config: RequestConfig = {}) { return this.request<T>(path, { ...config, method: 'PATCH', body }); }
  delete<T>(path: string, config: RequestConfig = {}) { return this.request<T>(path, { ...config, method: 'DELETE' }); }

  /** GET that returns the `{ items, meta }` pagination shape. */
  async paginate<T>(path: string, config: RequestConfig = {}): Promise<Paginated<T>> {
    type NestedPage = { items: T[]; pagination?: Paginated<T>['meta']; meta?: Paginated<T>['meta'] };
    const { data, meta } = await this.requestEnvelope<T[] | NestedPage>(path, { ...config, method: 'GET' });
    const items = Array.isArray(data) ? data : data.items;
    const pageMeta = Array.isArray(data) ? meta : data.pagination ?? data.meta ?? meta;
    return {
      items,
      meta: pageMeta ?? { page: 1, limit: items.length, total: items.length, totalPages: 1 },
    };
  }

  /** Core request → unwraps the ApiResponse envelope, returns `data`. */
  async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    return (await this.requestEnvelope<T>(path, config)).data;
  }

  private async requestEnvelope<T>(path: string, config: RequestConfig): Promise<ApiEnvelope<T>> {
    const method = config.method ?? 'GET';

    // Offline mutations → queue for replay instead of failing hard.
    if (!this.isOnline() && method !== 'GET') {
      if (config.offlineQueueable && this.enqueueOffline) this.enqueueOffline({ method, path, config });
      throw new ApiError({ message: 'You are offline. This action was queued.', kind: 'offline', retryable: true });
    }

    const maxRetries = config.retries ?? 2;
    let attempt = 0;
    let didRefresh = false;

    for (;;) {
      try {
        const res = await this.execute(path, config);

        if (res.status === 401 && !config.skipAuth && !didRefresh) {
          didRefresh = true;
          if (await this.refreshOnce()) continue; // retry once with a fresh token
          this.auth.onUnauthorized();
        }

        if (!res.ok) {
          const body = await this.parseBody(res);
          const err = errorFromResponse(res.status, body);
          if (err.retryable && attempt < maxRetries) { await backoff(attempt++); continue; }
          throw err;
        }

        const body = (await this.parseBody(res)) as ApiEnvelope<T> | T;
        // Support both the enveloped and bare responses.
        return isEnvelope<T>(body) ? body : { success: true, data: body as T };
      } catch (raw) {
        const err = toApiError(raw, { offline: !this.isOnline() });
        if (err.retryable && err.kind !== 'offline' && attempt < maxRetries) { await backoff(attempt++); continue; }
        this.errorInterceptors.forEach((i) => i(err));
        throw err;
      }
    }
  }

  private async execute(path: string, config: RequestConfig): Promise<Response> {
    const url = this.buildUrl(path, config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? this.timeoutMs);
    if (config.signal) config.signal.addEventListener('abort', () => controller.abort(), { once: true });

    let init: RequestInit = {
      method: config.method ?? 'GET',
      headers: this.buildHeaders(config),
      signal: controller.signal,
      ...(config.body != null ? { body: serializeBody(config.body) } : {}),
    };

    for (const interceptor of this.requestInterceptors) {
      const patched = await interceptor(url, init);
      if (patched) init = patched;
    }

    try {
      const res = await fetch(url, init);
      for (const interceptor of this.responseInterceptors) await interceptor(res, url);
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Single-flight refresh — concurrent 401s trigger exactly one refresh. */
  private refreshOnce(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.auth.refresh().finally(() => { this.refreshPromise = null; });
    }
    return this.refreshPromise;
  }

  private buildUrl(path: string, config: RequestConfig): string {
    const version = config.apiVersion ?? this.version;
    const base = this.baseUrl.replace(/\/$/, '').replace(/\/v\d+$/, `/${version}`);
    const qs = config.query ? buildQuery(config.query) : '';
    return `${base}${path.startsWith('/') ? path : `/${path}`}${qs}`;
  }

  private buildHeaders(config: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = { accept: 'application/json', ...config.headers };
    if (!(config.body instanceof FormData) && config.body != null) headers['content-type'] = 'application/json';
    if (!config.skipAuth) {
      const access = this.auth.getAccessToken();
      const guest = this.auth.getGuestToken();
      // 'guest' = session-scoped endpoints (cart/orders): the table session
      // stays the credential even after the customer signs into an account.
      const token = config.auth === 'guest' ? (guest ?? access) : (access ?? guest);
      if (token) headers.authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private async parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  }

  /* ── file transfer ── */

  /** Upload with progress (XHR — fetch has no upload progress event). */
  upload<T>(path: string, form: FormData, config: RequestConfig = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.buildUrl(path, config));
      const headers = this.buildHeaders({ ...config, body: form });
      Object.entries(headers).forEach(([k, v]) => { if (k !== 'content-type') xhr.setRequestHeader(k, v); });
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) config.onUploadProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        const body = safeParse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve((isEnvelope(body) ? body.data : body) as T);
        else reject(errorFromResponse(xhr.status, body));
      };
      xhr.onerror = () => reject(new ApiError({ message: 'Upload failed.', kind: 'network' }));
      xhr.ontimeout = () => reject(new ApiError({ message: 'Upload timed out.', kind: 'timeout' }));
      xhr.timeout = config.timeoutMs ?? 60000;
      xhr.send(form);
    });
  }

  /** Download a file as a Blob (respects auth). */
  async download(path: string, config: RequestConfig = {}): Promise<Blob> {
    const res = await this.execute(path, { ...config, method: 'GET' });
    if (!res.ok) throw errorFromResponse(res.status, await this.parseBody(res));
    return res.blob();
  }
}

/* ── helpers ── */
function isEnvelope<T>(body: unknown): body is ApiEnvelope<T> {
  return !!body && typeof body === 'object' && 'success' in body && 'data' in (body as object);
}
function serializeBody(body: unknown): BodyInit {
  return body instanceof FormData ? body : JSON.stringify(body);
}
function safeParse(text: string): unknown {
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}
function buildQuery(query: Record<string, string | number | boolean | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v != null && v !== '') params.append(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
}
function backoff(attempt: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
}

/** The app-wide singleton. Providers configure it at boot. */
export const api = new ApiClient();
