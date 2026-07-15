import { EmailChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../../constants/notification.constants.js';
import { httpClient } from '../http-client.js';

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Resend email adapter. Implements the platform EmailChannel contract over the
 * Resend HTTP API through the injected HTTP client. Interchangeable with the SMTP
 * adapter — the active email provider is chosen in config; business services only
 * ever see the EmailChannel interface.
 */
export class ResendEmailProvider extends EmailChannel {
  constructor({ http = httpClient, config } = {}) {
    super();
    this.provider = PROVIDER.RESEND;
    this.http = http;
    this.apiKey = config?.email?.resend?.apiKey ?? null;
    this.from = `${config?.email?.fromName ?? 'Keventers'} <${config?.email?.fromAddress ?? 'no-reply@keventers.example'}>`;
  }

  isReady() {
    return Boolean(this.apiKey);
  }

  async send(message) {
    if (!this.isReady()) return { success: false, error: 'resend_not_configured' };
    const res = await this.http.post(RESEND_URL, {
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: { from: this.from, to: message.to, subject: message.subject ?? '', html: message.body ?? '' },
    });
    if (!res.ok) return { success: false, error: `resend_http_${res.status}`, response: res.data };
    return { success: true, providerMessageId: res.data?.id ?? null, response: { id: res.data?.id } };
  }
}

export default ResendEmailProvider;
