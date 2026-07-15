import mongoose from 'mongoose';

import { ALL_CATEGORIES, CHANNEL } from '../constants/notification.constants.js';
import { baseSchemaOptions } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Per-user notification preferences: for each CATEGORY, which CHANNELS are
 * enabled. Resolution defaults to enabled when unset (opt-out model), except
 * MARKETING which is opt-in. Mandatory categories (security/system) always
 * deliver in-app regardless. Push device tokens live here too (FCM).
 */
const channelToggles = () => ({
  inapp: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  whatsapp: { type: Boolean, default: false },
});

const categoryPrefs = {};
for (const cat of ALL_CATEGORIES) {
  categoryPrefs[cat] = { type: new Schema(channelToggles(), { _id: false }), default: () => ({}) };
}

const preferenceSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    categories: categoryPrefs,

    // Contact overrides (else resolved from identity/customer at dispatch).
    email: { type: String, default: null },
    phone: { type: String, default: null },
    /** FCM/web-push device tokens for this user. */
    deviceTokens: [{ type: String }],

    // Global mute (still honours mandatory categories).
    mutedUntil: { type: Date, default: null },
  },
  baseSchemaOptions,
);

preferenceSchema.index({ organizationId: 1, restaurantId: 1, userId: 1 }, { unique: true });

// Convenience: default marketing to OFF across channels (opt-in).
preferenceSchema.pre('save', function defaultMarketingOff(next) {
  const m = this.categories?.marketing;
  if (m && this.isNew) {
    m.push = false;
    m.email = false;
    m.sms = false;
    m.whatsapp = false;
    m.inapp = true;
  }
  next();
});

export const NotificationPreference =
  mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', preferenceSchema);

export default NotificationPreference;
