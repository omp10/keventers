/**
 * Minimal injectable HTTP client for provider adapters. Uses the platform global
 * `fetch` (Node 18+). Injected as a dependency so adapters are unit-testable
 * WITHOUT real network calls (tests pass a fake), while production hits the real
 * gateway. Never logs request bodies (they carry credentials/PII).
 */
export class HttpClient {
  async request(method, url, { headers = {}, body = null } = {}) {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data };
  }

  get(url, opts) {
    return this.request('GET', url, opts);
  }

  post(url, opts) {
    return this.request('POST', url, opts);
  }
}

export const httpClient = new HttpClient();
export default httpClient;
