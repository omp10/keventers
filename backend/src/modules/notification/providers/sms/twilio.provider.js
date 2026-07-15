import { SmsChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../../constants/notification.constants.js';
import { httpClient } from '../http-client.js';

/**
 * Twilio SMS adapter over the Twilio Messages REST API (form-encoded + Basic
 * auth) through the injected HTTP client. Implements the platform SmsChannel
 * contract; interchangeable if another SMS provider is added.
 */
export class TwilioSmsProvider extends SmsChannel {
  constructor({ http = httpClient, config } = {}) {
    super();
    this.provider = PROVIDER.TWILIO;
    this.http = http;
    const c = config?.sms?.twilio ?? {};
    this.accountSid = c.accountSid ?? null;
    this.authToken = c.authToken ?? null;
    this.from = c.from ?? null;
  }

  isReady() {
    return Boolean(this.accountSid && this.authToken && this.from);
  }

  async send(message) {
    if (!this.isReady()) return { success: false, error: 'twilio_not_configured' };
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await this.http.post(url, {
      headers: { authorization: `Basic ${auth}` },
      body: { To: message.to, From: this.from, Body: message.body ?? '' },
      form: true,
    });
    if (!res.ok) return { success: false, error: `twilio_http_${res.status}`, response: res.data };
    return { success: true, providerMessageId: res.data?.sid ?? null, response: { sid: res.data?.sid, status: res.data?.status } };
  }
}

export default TwilioSmsProvider;
