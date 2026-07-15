import { NotificationChannel } from './notification-channel.interface.js';

/**
 * WhatsApp channel INTERFACE. A future provider adapter (e.g. WhatsApp Cloud
 * API, Gupshup) implements `send`. No provider is bound here.
 */
export class WhatsAppChannel extends NotificationChannel {
  static type = 'whatsapp';
}

export default WhatsAppChannel;
