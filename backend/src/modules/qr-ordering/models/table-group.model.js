import mongoose from 'mongoose';

import { TABLE_GROUP_TYPE } from '../constants/qr.constants.js';
import { baseSchemaOptions, softDeleteField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * TableGroup: a floor / zone / section that groups tables within a branch
 * (e.g. "Ground Floor", "Rooftop", "AC Section"). Branch-scoped. Tables
 * reference their group; a group is optional (a table may sit directly on a
 * floor with no zone).
 */
const tableGroupSchema = new Schema(
  {
    ...tenantFields,

    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(TABLE_GROUP_TYPE),
      default: TABLE_GROUP_TYPE.ZONE,
    },
    /** Floor label/number this group sits on (denormalised for table queries). */
    floor: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },

    ...softDeleteField,
  },
  baseSchemaOptions,
);

tableGroupSchema.index({ organizationId: 1, restaurantId: 1, branchId: 1, name: 1 }, { unique: true });
tableGroupSchema.index({ branchId: 1, isActive: 1, displayOrder: 1 });
tableGroupSchema.index({ deletedAt: 1 });

export const TableGroup =
  mongoose.models.TableGroup || mongoose.model('TableGroup', tableGroupSchema);

export default TableGroup;
