import mongoose from 'mongoose';

import {
  MENU_STATUS,
  MENU_TYPE,
  MENU_VISIBILITY,
} from '../constants/catalog.constants.js';
import {
  availabilityWindowSchema,
  baseSchemaOptions,
  softDeleteField,
  tenantFields,
} from '../utils/schema.util.js';

const { Schema } = mongoose;

/** Menu scheduling window — an ACTIVE menu is only "live" within this window
 * (used for seasonal/future menus). Null bounds = always in range. */
const scheduleSchema = new Schema(
  {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    /** Recurring intra-day/weekly windows (e.g. breakfast menu 08:00–11:00). */
    windows: { type: [availabilityWindowSchema()], default: [] },
  },
  { _id: false },
);

/**
 * Menu: the top of the catalog hierarchy. A restaurant may have MANY menus
 * (Breakfast, Lunch, Dinner, Kids, Festival, Seasonal) with independent
 * scheduling, visibility and versioning. Categories/products reference the
 * menus they belong to. Tenant-scoped (organizationId + restaurantId).
 */
const menuSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    type: { type: String, enum: Object.values(MENU_TYPE), default: MENU_TYPE.REGULAR },

    status: {
      type: String,
      enum: Object.values(MENU_STATUS),
      default: MENU_STATUS.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(MENU_VISIBILITY),
      default: MENU_VISIBILITY.PUBLIC,
    },

    /** Exactly-one active default menu is a service-layer concern; the flag is
     * stored here for fast lookups by ordering/QR modules. */
    isActive: { type: Boolean, default: false, index: true },
    isDefault: { type: Boolean, default: false },

    schedule: { type: scheduleSchema, default: () => ({}) },
    imageUrl: { type: String, default: null },
    imageKey: { type: String, default: null },

    displayOrder: { type: Number, default: 0 },

    /** Simple version counter, bumped on publish (menu versioning). The full
     * version history collection is a future extension; this supports optimistic
     * "which revision is live" checks now. */
    version: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    /** Free-form extension bag (kept small; typed fields preferred). */
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

// Tenant-scoped uniqueness + hot query paths.
menuSchema.index({ organizationId: 1, restaurantId: 1, slug: 1 }, { unique: true });
menuSchema.index({ restaurantId: 1, status: 1, displayOrder: 1 });
menuSchema.index({ restaurantId: 1, isActive: 1 });
menuSchema.index({ restaurantId: 1, type: 1 });
menuSchema.index({ deletedAt: 1 });

export const Menu = mongoose.models.Menu || mongoose.model('Menu', menuSchema);

export default Menu;
