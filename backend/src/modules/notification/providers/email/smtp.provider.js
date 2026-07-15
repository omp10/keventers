import { EmailChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../../constants/notification.constants.js';

/**
 * SMTP email adapter. To avoid coupling the platform to a specific SMTP library,
 * the transport is INJECTED (production wires nodemailer's transporter, which
 * exposes `sendMail`). Without a configured transport the channel reports
 * not-ready and the engine degrades gracefully. Interchangeable with Resend.
 */
export class SmtpEmailProvider extends EmailChannel {
  constructor({ transport = null, config } = {}) {
    super();
    this.provider = PROVIDER.SMTP;
    this.transport = transport; // { sendMail: ({from,to,subject,html}) => Promise<{messageId}> }
    this.cfg = config?.email?.smtp ?? {};
    this.from = `${config?.email?.fromName ?? 'Keventers'} <${config?.email?.fromAddress ?? 'no-reply@keventers.example'}>`;
  }

  isReady() {
    return Boolean(this.transport && this.cfg.host);
  }

  async send(message) {
    if (!this.isReady()) return { success: false, error: 'smtp_not_configured' };
    try {
      const info = await this.transport.sendMail({ from: this.from, to: message.to, subject: message.subject ?? '', html: message.body ?? '' });
      return { success: true, providerMessageId: info?.messageId ?? null };
    } catch (err) {
      return { success: false, error: err?.message ?? 'smtp_send_failed' };
    }
  }
}

export default SmtpEmailProvider;
