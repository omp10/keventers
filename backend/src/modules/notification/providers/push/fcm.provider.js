import jwt from 'jsonwebtoken';

import { PushChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../../constants/notification.constants.js';
import { httpClient } from '../http-client.js';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const v1Url = (projectId) => `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

/** Google refuses an assertion valid for more than an hour; 55m leaves slack. */
const TOKEN_TTL_SECONDS = 3300;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/**
 * Errors meaning THIS DEVICE IS GONE (app uninstalled, token rotated). Such a
 * token fails forever, so it is reported back for pruning.
 */
const DEAD_TOKEN_CODES = new Set(['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND', 'SENDER_ID_MISMATCH']);

/**
 * Firebase Cloud Messaging push adapter — HTTP **v1** API.
 *
 * This used to POST the LEGACY endpoint (`/fcm/send` with `Authorization: key=`).
 * Google decommissioned that API in June 2024 and no longer accepts legacy
 * server keys at all, so every push failed. v1 authenticates with a short-lived
 * OAuth2 access token minted from the SERVICE ACCOUNT — the same credential the
 * Firebase Admin SDK uses — signed locally with the project's private key (no
 * extra dependency, and the key never leaves this server).
 *
 * v1 sends ONE token per request (there is no `registration_ids` multicast), so
 * a multi-device recipient fans out here and the results are aggregated.
 */
export class FcmPushProvider extends PushChannel {
  #accessToken = null;
  #expiresAt = 0;

  constructor({ http = httpClient, config, now = () => Date.now() } = {}) {
    super();
    this.provider = PROVIDER.FCM;
    this.http = http;
    this.now = now;
    const c = config?.push?.fcm ?? {};
    const account = FcmPushProvider.parseServiceAccount(c.serviceAccount);
    this.clientEmail = account?.client_email ?? null;
    // Escaped newlines are the classic .env breakage — unescape defensively.
    this.privateKey = account?.private_key ? String(account.private_key).replace(/\\n/g, '\n') : null;
    // The service account names its own project — trust it over a stray env var.
    this.projectId = account?.project_id ?? c.projectId ?? null;
  }

  /** Accept the service account as a JSON string, a base64 blob, or an object. */
  static parseServiceAccount(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    const text = String(raw).trim();
    try {
      if (text.startsWith('{')) return JSON.parse(text);
      return JSON.parse(Buffer.from(text, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }

  isReady() {
    return Boolean(this.clientEmail && this.privateKey && this.projectId);
  }

  /**
   * A cached OAuth2 access token for the messaging scope. Minting costs a round
   * trip, so it is reused until shortly before expiry — a busy dinner service
   * would otherwise mint one per notification.
   */
  async #getAccessToken() {
    if (this.#accessToken && this.now() < this.#expiresAt - TOKEN_REFRESH_MARGIN_MS) return this.#accessToken;

    let assertion;
    try {
      assertion = jwt.sign({ scope: FCM_SCOPE }, this.privateKey, {
        algorithm: 'RS256',
        issuer: this.clientEmail,
        subject: this.clientEmail,
        audience: OAUTH_TOKEN_URL,
        expiresIn: TOKEN_TTL_SECONDS,
      });
    } catch (err) {
      // A malformed private key must say so plainly rather than surfacing as a
      // generic auth failure nobody can act on.
      return { error: `fcm_bad_private_key: ${err?.message ?? 'sign_failed'}` };
    }

    const res = await this.http.post(OAUTH_TOKEN_URL, {
      form: true,
      body: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion },
    });
    if (!res.ok || !res.data?.access_token) return { error: `fcm_oauth_${res.status}`, response: res.data };

    this.#accessToken = res.data.access_token;
    this.#expiresAt = this.now() + Number(res.data.expires_in ?? 3600) * 1000;
    return this.#accessToken;
  }

  /** v1 requires every `data` value to be a string — a number 400s the request. */
  static stringifyData(data = {}) {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null) continue;
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return out;
  }

  buildMessage(token, message) {
    // `link` drives the service worker's notificationclick navigation.
    const link = message.data?.link ?? message.link ?? null;
    return {
      message: {
        token,
        notification: { title: message.subject ?? 'Keventers', body: message.body ?? '' },
        data: FcmPushProvider.stringifyData(message.data),
        webpush: {
          notification: { icon: message.icon ?? '/icons/icon-192.png' },
          ...(link ? { fcm_options: { link } } : {}),
        },
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
      },
    };
  }

  async send(message) {
    if (!this.isReady()) return { success: false, error: 'fcm_not_configured' };
    const tokens = (Array.isArray(message.to) ? message.to : [message.to]).filter(Boolean);
    if (!tokens.length) return { success: false, error: 'no_device_tokens' };

    const access = await this.#getAccessToken();
    if (typeof access !== 'string') return { success: false, ...access };

    const url = v1Url(this.projectId);
    const headers = { authorization: `Bearer ${access}` };
    const results = await Promise.all(
      tokens.map((token) => this.http
        .post(url, { headers, body: this.buildMessage(token, message) })
        .then((res) => ({ token, res }))),
    );

    const invalidTokens = [];
    let sent = 0;
    let firstError = null;
    let providerMessageId = null;
    for (const { token, res } of results) {
      if (res.ok) {
        sent += 1;
        providerMessageId ??= res.data?.name ?? null;
        continue;
      }
      const code = res.data?.error?.details?.find((d) => d?.errorCode)?.errorCode ?? res.data?.error?.status ?? null;
      if (DEAD_TOKEN_CODES.has(code)) invalidTokens.push(token);
      firstError ??= `fcm_http_${res.status}${code ? `_${code}` : ''}`;
    }

    // Stale tokens alone are NOT a failure — the live devices got the message.
    if (sent > 0) return { success: true, providerMessageId, response: { sent, failed: tokens.length - sent }, invalidTokens };
    return { success: false, error: firstError ?? 'fcm_send_failed', invalidTokens };
  }
}

export default FcmPushProvider;
