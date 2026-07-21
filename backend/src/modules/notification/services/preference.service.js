import { BadRequestError } from '#core/errors/app-error.js';
import { BaseService } from '#core/service/base.service.js';
import { userService } from '#modules/identity/index.js';

import {
  CHANNEL,
  MANDATORY_CATEGORIES,
} from '../constants/notification.constants.js';
import { toPreferenceDTO } from '../dto/notification.dto.js';
import { preferenceRepository } from '../repositories/preference.repository.js';
import { normalizePushPlatform } from '../utils/push-platform.util.js';

/**
 * Notification preference service. Resolves — per (user, category, channel) —
 * whether a channel may be used, honoring: opt-out defaults (marketing is
 * opt-in), a global mute window, and MANDATORY categories (security/system)
 * which always allow the in-app channel regardless of preferences. Also resolves
 * the recipient's contact (email/phone/device tokens) from the preference
 * overrides or the identity profile.
 */
export class PreferenceService extends BaseService {
  constructor({ preferences = preferenceRepository, users = userService, eventBus } = {}) {
    super({ name: 'notification.preference', eventBus });
    this.preferences = preferences;
    this.users = users;
  }

  getForUser(scope, userId) {
    return this.preferences.findByUser(scope, userId);
  }

  async getPreferencesDTO(scope, userId) {
    const pref = await this.preferences.ensureForUser(scope, userId);
    return toPreferenceDTO(pref);
  }

  async updatePreferences(scope, userId, data, actorId = null) {
    const patch = {};
    if (data.categories) {
      for (const [cat, channels] of Object.entries(data.categories)) {
        for (const [ch, on] of Object.entries(channels)) patch[`categories.${cat}.${ch}`] = Boolean(on);
      }
    }
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.deviceTokens !== undefined) patch.deviceTokens = data.deviceTokens;
    if (data.mutedUntil !== undefined) patch.mutedUntil = data.mutedUntil;
    const updated = await this.preferences.updateForUser(scope, userId, patch);
    this.audit.success('notification.preference.updated', { actorId: actorId ?? userId, targetId: String(userId) });
    return toPreferenceDTO(updated);
  }

  /** Register an FCM device token for push (idempotent). */
  async registerDevice(scope, userId, token) {
    const pref = await this.preferences.addDeviceToken(scope, userId, token);
    return toPreferenceDTO(pref);
  }

  /**
   * Register an FCM token for a SURFACE (web vs mobile) — the shape the user,
   * staff and kitchen apps all post. Writes the dedicated field on the user AND
   * keeps the legacy deviceTokens array in step, so delivery works whichever a
   * client registered through.
   *
   * Re-registering the same surface REPLACES its token: FCM rotates tokens, and
   * appending forever would leave us pushing to dead registrations.
   */
  async registerFcmToken(scope, userId, { token, platform } = {}) {
    const value = String(token ?? '').trim();
    if (!value) throw new BadRequestError('A device token is required');
    const surface = normalizePushPlatform(platform);
    const field = surface === 'mobile' ? 'fcmTokenMobile' : 'fcmTokenWeb';

    const previous = await this.users.getUser(userId).catch(() => null);
    const stale = previous?.[field];
    await this.users.setFcmToken(userId, field, value);

    // Legacy array: swap the stale token for the new one so it can't go stale.
    if (stale && stale !== value) {
      await this.preferences.removeDeviceToken(scope, userId, stale).catch(() => null);
    }
    const pref = await this.preferences.addDeviceToken(scope, userId, value);
    return { platform: surface, field, registered: true, preferences: toPreferenceDTO(pref) };
  }

  /** Drop a device token (logout / permission revoked). */
  async unregisterDevice(scope, userId, token) {
    const pref = await this.preferences.removeDeviceToken(scope, userId, token);
    return pref ? toPreferenceDTO(pref) : null;
  }

  /**
   * Send a test push straight to this user's own registered devices, bypassing
   * the outbox/template pipeline so it isolates the PUSH leg: credentials,
   * Google, service worker, device. Reports precisely why nothing arrived
   * ("no_devices" vs "fcm_not_configured" vs an FCM error) — a silent failure
   * here is what makes push so miserable to debug.
   */
  async sendTestPush(scope, userId, { title, body } = {}) {
    const pref = await this.getForUser(scope, userId).catch(() => null);
    const tokens = pref?.deviceTokens ?? [];
    if (!tokens.length) return { sent: false, reason: 'no_devices', deviceCount: 0 };

    const { notificationRegistry } = await import('#platform/notification/index.js');
    const provider = notificationRegistry.get(CHANNEL.PUSH);
    if (!provider?.isReady?.()) return { sent: false, reason: 'fcm_not_configured', deviceCount: tokens.length };

    const result = await provider.send({
      to: tokens,
      subject: title || 'Test notification',
      body: body || 'Push is working. This is a test from Keventers.',
      data: { type: 'test', link: '/' },
    });
    return {
      sent: Boolean(result?.success),
      deviceCount: tokens.length,
      reason: result?.success ? null : (result?.error ?? 'unknown'),
      invalidTokens: result?.invalidTokens?.length ?? 0,
      response: result?.response ?? null,
    };
  }

  /**
   * Is `channel` allowed for `category` given the user's prefs?
   * @param {object|null} pref  the preference doc (may be null → defaults)
   */
  isAllowed(pref, category, channel) {
    // Mandatory categories always allow in-app; other channels still honor prefs.
    if (channel === CHANNEL.IN_APP && MANDATORY_CATEGORIES.includes(category)) return true;
    if (!pref) return this.#default(category, channel);
    if (pref.mutedUntil && new Date(pref.mutedUntil).getTime() > Date.now() && !MANDATORY_CATEGORIES.includes(category)) {
      return channel === CHANNEL.IN_APP; // muted → keep the inbox record only
    }
    const cat = pref.categories?.[category];
    if (!cat) return this.#default(category, channel);
    return Boolean(cat[channel]);
  }

  #default(category, channel) {
    if (channel === CHANNEL.IN_APP) return true;
    if (category === 'marketing') return false; // opt-in
    if (channel === CHANNEL.SMS || channel === CHANNEL.WHATSAPP) return false; // opt-in
    return true; // push/email on by default for transactional categories
  }

  /** Resolve contact for external channels (pref override → identity profile). */
  async resolveContact(pref, userId) {
    let email = pref?.email ?? null;
    let phone = pref?.phone ?? null;
    // Push targets come from BOTH stores: the per-surface fields the apps
    // register (web + mobile) and the legacy array. Deduped, because a client
    // that used the old /devices endpoint will appear in both.
    const tokens = new Set((pref?.deviceTokens ?? []).filter(Boolean));
    if (userId) {
      const user = await this.users.getUser(userId).catch(() => null);
      email = email ?? user?.email ?? null;
      phone = phone ?? user?.phone ?? user?.phoneNumber ?? null;
      if (user?.fcmTokenWeb) tokens.add(user.fcmTokenWeb);
      if (user?.fcmTokenMobile) tokens.add(user.fcmTokenMobile);
    }
    return { email, phone, deviceTokens: [...tokens] };
  }
}

export const preferenceService = new PreferenceService();
export default preferenceService;
