import mongoose from 'mongoose';

import { baseSchemaOptions, softDeleteField } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Role: a named bundle of permissions. Permissions are stored denormalized as
 * permission NAMES (strings referencing Permission.name) so authorization can
 * resolve a role's grants without a join — avoiding N+1 lookups at auth time.
 */
const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]+$/,
    },
    displayName: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    permissions: { type: [String], default: [] },
    // System roles (e.g. super_admin) are immutable via the API.
    isSystem: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    ...softDeleteField,
  },
  baseSchemaOptions,
);

roleSchema.index({ isSystem: 1 });
roleSchema.index({ deletedAt: 1 });

export const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

export default Role;
