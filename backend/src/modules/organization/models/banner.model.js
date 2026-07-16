import mongoose from 'mongoose';

import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

export const BANNER_PLACEMENT = Object.freeze({
  CUSTOMER_HOME: 'customer_home',
});

export const BANNER_THEME = Object.freeze({
  BRAND: 'brand', // primary-gradient surface (white-label safe)
  ACCENT: 'accent', // accent surface
  IMAGE: 'image', // full-bleed image with scrim
});

export const BANNER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

/**
 * Banner: an ADMIN-MANAGED promotional slide surfaced to the customer app
 * (home carousel today; more placements later). Platform-scoped — not tenant
 * data — so super admins curate what every customer sees. The customer app
 * renders title/subtitle/cta over a themed surface or the uploaded image; an
 * optional branch slug deep-links straight into ordering.
 */
const bannerSchema = new Schema(
  {
    placement: {
      type: String,
      enum: Object.values(BANNER_PLACEMENT),
      default: BANNER_PLACEMENT.CUSTOMER_HOME,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, default: '', maxlength: 160 },
    /** Visual treatment the client applies via its theme tokens. */
    theme: { type: String, enum: Object.values(BANNER_THEME), default: BANNER_THEME.BRAND },
    imageUrl: { type: String, default: null },
    cta: {
      type: new Schema(
        {
          label: { type: String, trim: true, default: '' },
          /** In-app path ("/discover", "/r/<slug>/menu") or absolute URL. */
          href: { type: String, trim: true, default: '' },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    /** Optional deep-link target branch (validated to exist on write). */
    branchSlug: { type: String, trim: true, lowercase: true, default: null },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(BANNER_STATUS),
      default: BANNER_STATUS.ACTIVE,
      index: true,
    },
    /** Optional scheduling window. */
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

bannerSchema.index({ placement: 1, status: 1, sortOrder: 1 });
bannerSchema.index({ deletedAt: 1 });

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

export default Banner;
