import mongoose from 'mongoose';

import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Permission catalog entry. A permission is a `resource:action` capability that
 * roles (or users) can be granted.
 */
const permissionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      // e.g. "identity:user:create"
      match: /^[a-z0-9-]+:[a-z0-9-]+(:[a-z0-9-]+)?$/,
    },
    resource: { type: String, required: true, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    isSystem: { type: Boolean, default: false },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

// Indexes
permissionSchema.index({ name: 1 }, { unique: true });
permissionSchema.index({ resource: 1, action: 1 });
permissionSchema.index({ deletedAt: 1 });

export const Permission =
  mongoose.models.Permission || mongoose.model('Permission', permissionSchema);

export default Permission;
