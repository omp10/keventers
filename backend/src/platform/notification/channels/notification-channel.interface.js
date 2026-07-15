/**
 * Base contract for every notification channel. Concrete providers (SendGrid,
 * Twilio, FCM, WhatsApp Cloud API, …) implement `send`. Only interfaces are
 * defined in this phase — no provider is wired.
 *
 * @typedef {object} NotificationMessage
 * @property {string|string[]} to
 * @property {string} [subject]
 * @property {string} [body]
 * @property {string} [templateId]
 * @property {Record<string, unknown>} [data]
 *
 * @typedef {object} NotificationResult
 * @property {boolean} success
 * @property {string} [providerMessageId]
 * @property {string} [error]
 */
export class NotificationChannel {
  /** @type {string} Channel type identifier, e.g. 'email'. */
  static type = 'base';

  /* eslint-disable no-unused-vars, class-methods-use-this */
  /**
   * @param {NotificationMessage} message
   * @returns {Promise<NotificationResult>}
   */
  async send(message) {
    throw new Error(`${new.target.type} channel: send() not implemented`);
  }

  /** Whether the channel is configured/ready to send. */
  isReady() {
    return false;
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export default NotificationChannel;
