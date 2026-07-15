import mongoose from 'mongoose';

import {
  CATEGORY,
  CHANNEL,
  DEFAULT_LOCALE,
} from '../constants/notification.constants.js';
import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Notification template — reusable, versioned, localized content per
 * (key, channel, locale). Templates may be PLATFORM-global (organizationId +
 * restaurantId null) or restaurant-scoped overrides; resolution prefers the most
 * specific active version. `variables` documents the tokens the body references.
 */
const templateSchema = new Schema(
  {
    // Null org/restaurant = platform-global default template.
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },

    key: { type: String, required: true, trim: true }, // e.g. 'order_ready'
    channel: { type: String, enum: Object.values(CHANNEL), required: true },
    locale: { type: String, default: DEFAULT_LOCALE },
    category: { type: String, enum: Object.values(CATEGORY), required: true },

    subject: { type: String, default: null }, // email / push title
    body: { type: String, required: true },
    variables: [{ type: String }],

    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

// One ACTIVE template per (scope, key, channel, locale). Nulls = global scope.
templateSchema.index(
  { organizationId: 1, restaurantId: 1, key: 1, channel: 1, locale: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
templateSchema.index({ key: 1, channel: 1, locale: 1, isActive: 1 });

export const NotificationTemplate =
  mongoose.models.NotificationTemplate || mongoose.model('NotificationTemplate', templateSchema);

export default NotificationTemplate;
