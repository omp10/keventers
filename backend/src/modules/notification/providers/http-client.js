/**
 * Tiny injectable HTTP client over global fetch (Node 18+). Provider adapters
 * depend on this so they run for real in production and are trivially mocked in
 * tests (no network). Never throws on non-2xx — returns a normalized result.
 */
export class HttpClient {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async post(url, { headers = {}, body, form = false } = {}) {
    return this.#request('POST', url, { headers, body, form });
  }

  async #request(method, url, { headers, body, form }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const init = { method, headers: { ...headers }, signal: controller.signal };
      if (body != null) {
        if (form) {
          init.headers['content-type'] = 'application/x-www-form-urlencoded';
          init.body = new URLSearchParams(body).toString();
        } else {
          init.headers['content-type'] = 'application/json';
          init.body = JSON.stringify(body);
        }
      }
      const res = await this.fetchImpl(url, init);
      const text = await res.text().catch(() => '');
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: null, error: err?.message ?? 'network_error' };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const httpClient = new HttpClient();
export default httpClient;
