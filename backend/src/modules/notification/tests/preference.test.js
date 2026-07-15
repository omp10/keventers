import { describe, expect, it } from 'vitest';

import { PreferenceService } from '../services/preference.service.js';
import { CATEGORY, CHANNEL } from '../constants/notification.constants.js';

const svc = new PreferenceService({ preferences: {}, users: {} });

describe('PreferenceService.isAllowed', () => {
  it('always allows in-app for mandatory categories regardless of prefs', () => {
    const muted = { mutedUntil: new Date(Date.now() + 3600000), categories: { security: { inapp: false } } };
    expect(svc.isAllowed(muted, CATEGORY.SECURITY, CHANNEL.IN_APP)).toBe(true);
  });

  it('defaults transactional email/push ON and sms/whatsapp OFF when unset', () => {
    expect(svc.isAllowed(null, CATEGORY.ORDER_UPDATES, CHANNEL.EMAIL)).toBe(true);
    expect(svc.isAllowed(null, CATEGORY.ORDER_UPDATES, CHANNEL.PUSH)).toBe(true);
    expect(svc.isAllowed(null, CATEGORY.ORDER_UPDATES, CHANNEL.SMS)).toBe(false);
    expect(svc.isAllowed(null, CATEGORY.ORDER_UPDATES, CHANNEL.WHATSAPP)).toBe(false);
  });

  it('treats marketing as opt-in (off by default)', () => {
    expect(svc.isAllowed(null, CATEGORY.MARKETING, CHANNEL.EMAIL)).toBe(false);
    expect(svc.isAllowed(null, CATEGORY.MARKETING, CHANNEL.IN_APP)).toBe(true);
  });

  it('honors explicit per-category channel toggles', () => {
    const pref = { categories: { order_updates: { email: false, push: true, inapp: true } } };
    expect(svc.isAllowed(pref, CATEGORY.ORDER_UPDATES, CHANNEL.EMAIL)).toBe(false);
    expect(svc.isAllowed(pref, CATEGORY.ORDER_UPDATES, CHANNEL.PUSH)).toBe(true);
  });

  it('a mute window suppresses external channels but keeps the in-app record', () => {
    const pref = { mutedUntil: new Date(Date.now() + 3600000), categories: { order_updates: { email: true, inapp: true } } };
    expect(svc.isAllowed(pref, CATEGORY.ORDER_UPDATES, CHANNEL.EMAIL)).toBe(false);
    expect(svc.isAllowed(pref, CATEGORY.ORDER_UPDATES, CHANNEL.IN_APP)).toBe(true);
  });

  it('resolves contact from identity when the preference has no override', async () => {
    const withUser = new PreferenceService({ preferences: {}, users: { async getUser() { return { email: 'a@x.com', phone: '+91' }; } } });
    const contact = await withUser.resolveContact(null, 'user-1');
    expect(contact).toMatchObject({ email: 'a@x.com', phone: '+91' });
  });
});
