import { PushChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../../constants/notification.constants.js';
import { httpClient } from '../http-client.js';

const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send';

/**
 * Firebase Cloud Messaging push adapter through the injected HTTP client. `to`
 * is a device token (or an array of tokens). Implements the platform PushChannel
 * contract; interchangeable if another push provider is added.
 */
export class FcmPushProvider extends PushChannel {
  constructor({ http = httpClient, config } = {}) {
    super();
    this.provider = PROVIDER.FCM;
    this.http = http;
    const c = config?.push?.fcm ?? {};
    this.serverKey = c.serverKey ?? null;
    this.projectId = c.projectId ?? null;
  }

  isReady() {
    return Boolean(this.serverKey);
  }

  async send(message) {
    if (!this.isReady()) return { success: false, error: 'fcm_not_configured' };
    const tokens = Array.isArray(message.to) ? message.to : [message.to];
    if (!tokens.filter(Boolean).length) return { success: false, error: 'no_device_tokens' };
    const res = await this.http.post(FCM_LEGACY_URL, {
      headers: { authorization: `key=${this.serverKey}` },
      body: {
        registration_ids: tokens,
        notification: { title: message.subject ?? 'Keventers', body: message.body ?? '' },
        data: message.data ?? {},
      },
    });
    if (!res.ok) return { success: false, error: `fcm_http_${res.status}`, response: res.data };
    return { success: true, providerMessageId: res.data?.multicast_id ? String(res.data.multicast_id) : null, response: { success: res.data?.success, failure: res.data?.failure } };
  }
}

export default FcmPushProvider;
