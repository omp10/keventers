import { BaseService } from '#core/service/base.service.js';
import { userService } from '#modules/identity/index.js';

import {
  CHANNEL,
  MANDATORY_CATEGORIES,
} from '../constants/notification.constants.js';
import { toPreferenceDTO } from '../dto/notification.dto.js';
import { preferenceRepository } from '../repositories/preference.repository.js';

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
    const deviceTokens = pref?.deviceTokens ?? [];
    if ((!email || !phone) && userId) {
      const user = await this.users.getUser(userId).catch(() => null);
      email = email ?? user?.email ?? null;
      phone = phone ?? user?.phone ?? user?.phoneNumber ?? null;
    }
    return { email, phone, deviceTokens };
  }
}

export const preferenceService = new PreferenceService();
export default preferenceService;
