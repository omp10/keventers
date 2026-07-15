import { WhatsAppChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../../constants/notification.constants.js';
import { httpClient } from '../http-client.js';

/**
 * WhatsApp adapter over the Meta (WhatsApp) Cloud API through the injected HTTP
 * client. Sends a plain text message (production would use approved message
 * templates for the first contact). Implements the platform WhatsAppChannel
 * contract.
 */
export class MetaWhatsAppProvider extends WhatsAppChannel {
  constructor({ http = httpClient, config } = {}) {
    super();
    this.provider = PROVIDER.META;
    this.http = http;
    const c = config?.whatsapp?.meta ?? {};
    this.phoneNumberId = c.phoneNumberId ?? null;
    this.accessToken = c.accessToken ?? null;
  }

  isReady() {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  async send(message) {
    if (!this.isReady()) return { success: false, error: 'meta_wa_not_configured' };
    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const res = await this.http.post(url, {
      headers: { authorization: `Bearer ${this.accessToken}` },
      body: { messaging_product: 'whatsapp', to: message.to, type: 'text', text: { body: message.body ?? '' } },
    });
    if (!res.ok) return { success: false, error: `meta_wa_http_${res.status}`, response: res.data };
    return { success: true, providerMessageId: res.data?.messages?.[0]?.id ?? null };
  }
}

export default MetaWhatsAppProvider;
