import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { FcmPushProvider } from '../providers/push/fcm.provider.js';

/** A throwaway RS256 keypair so the OAuth assertion is signed for real. */
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const ACCOUNT = { client_email: 'push@demo.iam.gserviceaccount.com', private_key: privateKey, project_id: 'demo-project' };
const config = { push: { fcm: { serviceAccount: JSON.stringify(ACCOUNT) } } };

/** Records every call and replies per-URL. */
function stubHttp(handler) {
  const calls = [];
  return {
    calls,
    post: async (url, opts) => {
      calls.push({ url, opts });
      return handler(url, opts, calls);
    },
  };
}

const okOAuth = { ok: true, status: 200, data: { access_token: 'ya29.test', expires_in: 3600 } };
const isOAuth = (url) => url.includes('oauth2.googleapis.com');

describe('FcmPushProvider — readiness', () => {
  it('is not ready without a service account', () => {
    expect(new FcmPushProvider({ config: {} }).isReady()).toBe(false);
  });

  it('is ready with one, and takes the project id from it', () => {
    const p = new FcmPushProvider({ config });
    expect(p.isReady()).toBe(true);
    expect(p.projectId).toBe('demo-project');
  });

  it('accepts a base64-encoded service account', () => {
    const b64 = Buffer.from(JSON.stringify(ACCOUNT)).toString('base64');
    expect(new FcmPushProvider({ config: { push: { fcm: { serviceAccount: b64 } } } }).isReady()).toBe(true);
  });

  it('reports not-configured instead of throwing', async () => {
    const res = await new FcmPushProvider({ config: {} }).send({ to: ['t'], body: 'hi' });
    expect(res).toEqual({ success: false, error: 'fcm_not_configured' });
  });
});

describe('FcmPushProvider — HTTP v1 contract', () => {
  it('posts to the v1 endpoint with a bearer token, not the dead legacy API', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? okOAuth : { ok: true, status: 200, data: { name: 'projects/demo/messages/1' } }));
    const res = await new FcmPushProvider({ http, config }).send({ to: ['tok1'], subject: 'Hi', body: 'There' });

    expect(res.success).toBe(true);
    const send = http.calls.find((c) => !isOAuth(c.url));
    expect(send.url).toBe('https://fcm.googleapis.com/v1/projects/demo-project/messages:send');
    expect(send.opts.headers.authorization).toBe('Bearer ya29.test');
    // The legacy endpoint/scheme must never be used again.
    expect(http.calls.some((c) => c.url.endsWith('/fcm/send'))).toBe(false);
    expect(send.opts.headers.authorization.startsWith('key=')).toBe(false);
  });

  it('sends one request PER TOKEN (v1 has no multicast)', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? okOAuth : { ok: true, status: 200, data: {} }));
    await new FcmPushProvider({ http, config }).send({ to: ['a', 'b', 'c'], body: 'x' });
    expect(http.calls.filter((c) => !isOAuth(c.url))).toHaveLength(3);
  });

  it('stringifies data values — v1 rejects non-strings', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? okOAuth : { ok: true, status: 200, data: {} }));
    await new FcmPushProvider({ http, config }).send({ to: ['t'], body: 'x', data: { orderId: 7, ok: true, link: '/orders/7' } });
    const { data } = http.calls.find((c) => !isOAuth(c.url)).opts.body.message;
    expect(data).toEqual({ orderId: '7', ok: 'true', link: '/orders/7' });
  });

  it('passes the click-through link to the service worker', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? okOAuth : { ok: true, status: 200, data: {} }));
    await new FcmPushProvider({ http, config }).send({ to: ['t'], body: 'x', data: { link: '/orders/42' } });
    expect(http.calls.find((c) => !isOAuth(c.url)).opts.body.message.webpush.fcm_options.link).toBe('/orders/42');
  });

  it('caches the access token across sends', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? okOAuth : { ok: true, status: 200, data: {} }));
    const p = new FcmPushProvider({ http, config });
    await p.send({ to: ['a'], body: 'x' });
    await p.send({ to: ['b'], body: 'y' });
    expect(http.calls.filter((c) => isOAuth(c.url))).toHaveLength(1);
  });
});

describe('FcmPushProvider — failure handling', () => {
  it('reports dead tokens for pruning and still succeeds if a live device got it', async () => {
    const http = stubHttp((url, opts) => {
      if (isOAuth(url)) return okOAuth;
      return opts.body.message.token === 'dead'
        ? { ok: false, status: 404, data: { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } } }
        : { ok: true, status: 200, data: {} };
    });
    const res = await new FcmPushProvider({ http, config }).send({ to: ['live', 'dead'], body: 'x' });
    expect(res.success).toBe(true);
    expect(res.invalidTokens).toEqual(['dead']);
    expect(res.response).toEqual({ sent: 1, failed: 1 });
  });

  it('fails when every token is dead', async () => {
    const http = stubHttp((url) => (isOAuth(url)
      ? okOAuth
      : { ok: false, status: 404, data: { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } } }));
    const res = await new FcmPushProvider({ http, config }).send({ to: ['d1', 'd2'], body: 'x' });
    expect(res.success).toBe(false);
    expect(res.invalidTokens).toEqual(['d1', 'd2']);
  });

  it('does NOT prune on a transient server error', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? okOAuth : { ok: false, status: 503, data: { error: { status: 'UNAVAILABLE' } } }));
    const res = await new FcmPushProvider({ http, config }).send({ to: ['t'], body: 'x' });
    expect(res.success).toBe(false);
    expect(res.invalidTokens).toEqual([]);
    expect(res.error).toContain('503');
  });

  it('surfaces an OAuth failure rather than pretending to send', async () => {
    const http = stubHttp((url) => (isOAuth(url) ? { ok: false, status: 401, data: { error: 'invalid_grant' } } : { ok: true, status: 200, data: {} }));
    const res = await new FcmPushProvider({ http, config }).send({ to: ['t'], body: 'x' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('fcm_oauth_401');
    expect(http.calls.filter((c) => !isOAuth(c.url))).toHaveLength(0);
  });

  it('names a malformed private key', async () => {
    const bad = { push: { fcm: { serviceAccount: JSON.stringify({ ...ACCOUNT, private_key: 'not-a-key' }) } } };
    const res = await new FcmPushProvider({ http: stubHttp(() => okOAuth), config: bad }).send({ to: ['t'], body: 'x' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('fcm_bad_private_key');
  });

  it('refuses an empty token list', async () => {
    const res = await new FcmPushProvider({ http: stubHttp(() => okOAuth), config }).send({ to: [], body: 'x' });
    expect(res).toEqual({ success: false, error: 'no_device_tokens' });
  });
});
