import { describe, expect, it } from 'vitest';

import { ResendEmailProvider } from '../providers/email/resend.provider.js';
import { TwilioSmsProvider } from '../providers/sms/twilio.provider.js';
import { MetaWhatsAppProvider } from '../providers/whatsapp/meta.provider.js';
import { FcmPushProvider } from '../providers/push/fcm.provider.js';
import { inAppChannel } from '../providers/inapp.provider.js';

const okHttp = (data = {}) => ({ async post() { return { ok: true, status: 200, data }; } });
const errHttp = () => ({ async post() { return { ok: false, status: 500, data: { error: 'boom' } }; } });

describe('Provider adapters — implement the platform channel contract', () => {
  it('Resend email: sends via HTTP and returns the provider message id', async () => {
    const p = new ResendEmailProvider({ http: okHttp({ id: 're_123' }), config: { email: { resend: { apiKey: 'k' }, fromName: 'Kev', fromAddress: 'x@y.z' } } });
    expect(p.isReady()).toBe(true);
    const r = await p.send({ to: 'a@b.c', subject: 'Hi', body: '<b>x</b>' });
    expect(r).toMatchObject({ success: true, providerMessageId: 're_123' });
  });

  it('Resend email: reports not-ready + refuses to send without an API key', async () => {
    const p = new ResendEmailProvider({ http: okHttp(), config: { email: { resend: {} } } });
    expect(p.isReady()).toBe(false);
    expect((await p.send({ to: 'a@b.c' })).success).toBe(false);
  });

  it('Twilio SMS: posts to the Messages API and returns the sid', async () => {
    const p = new TwilioSmsProvider({ http: okHttp({ sid: 'SM1', status: 'queued' }), config: { sms: { twilio: { accountSid: 'AC', authToken: 't', from: '+1' } } } });
    const r = await p.send({ to: '+91', body: 'hi' });
    expect(r).toMatchObject({ success: true, providerMessageId: 'SM1' });
  });

  it('Meta WhatsApp: returns the message id from the graph response', async () => {
    const p = new MetaWhatsAppProvider({ http: okHttp({ messages: [{ id: 'wamid.1' }] }), config: { whatsapp: { meta: { phoneNumberId: 'pid', accessToken: 'tok' } } } });
    const r = await p.send({ to: '+91', body: 'hi' });
    expect(r).toMatchObject({ success: true, providerMessageId: 'wamid.1' });
  });

  it('FCM push: refuses when there are no device tokens', async () => {
    const p = new FcmPushProvider({ http: okHttp(), config: { push: { fcm: { serverKey: 'k' } } } });
    expect((await p.send({ to: [] })).success).toBe(false);
  });

  it('propagates a provider HTTP error as a failed result (not a throw)', async () => {
    const p = new TwilioSmsProvider({ http: errHttp(), config: { sms: { twilio: { accountSid: 'AC', authToken: 't', from: '+1' } } } });
    const r = await p.send({ to: '+91', body: 'hi' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('twilio_http_500');
  });

  it('in-app channel is always ready and succeeds synchronously', async () => {
    expect(inAppChannel.isReady()).toBe(true);
    expect((await inAppChannel.send({ data: { notificationId: 'n1' } })).success).toBe(true);
  });
});
