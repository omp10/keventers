import mongoose from 'mongoose';

import {
  ACTOR_TYPE,
  ASSIGNMENT_MODE,
  KITCHEN_STATUS,
  PRIORITY,
} from '../constants/kitchen.constants.js';

const { Schema } = mongoose;

/** A kitchen line item (snapshot of the relevant order item) + its station(s). */
const kitchenItemSchema = new Schema(
  {
    orderItemId: { type: String, default: null },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    name: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    variantName: { type: String, default: '' },
    modifiers: { type: [{ type: String }], default: [] },
    specialInstructions: { type: String, default: '' },
    stationIds: { type: [{ type: Schema.Types.ObjectId, ref: 'KitchenStation' }], default: [] },
  },
  { _id: false },
);

/** Immutable workflow timeline entry. */
const timelineSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorType: { type: String, enum: Object.values(ACTOR_TYPE), default: ACTOR_TYPE.SYSTEM },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * KitchenQueueEntry: one per confirmed order. Branch-scoped. Snapshots the
 * order's kitchen-relevant items + their station routing, tracks the prep
 * workflow, chef assignment, per-transition timers and SLA state. Driven by
 * Order events (kitchen never writes back to the order). Optimistically
 * versioned. Kitchen entries are historical records (no soft delete — terminal
 * states SERVED / CANCELLED).
 */
const queueEntrySchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    /** Source order — UNIQUE (one kitchen entry per order; idempotent enqueue). */
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    orderType: { type: String, default: 'dine_in' },

    status: {
      type: String,
      enum: Object.values(KITCHEN_STATUS),
      default: KITCHEN_STATUS.PENDING,
      index: true,
    },
    priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.NORMAL },
    /** Denormalised numeric weight for board sorting (rush first, then FIFO). */
    priorityWeight: { type: Number, default: 0 },

    items: { type: [kitchenItemSchema], default: [] },
    /** Union of every station the order's items touch (routing). */
    stationIds: { type: [{ type: Schema.Types.ObjectId, ref: 'KitchenStation' }], default: [], index: true },

    assignment: {
      mode: { type: String, enum: Object.values(ASSIGNMENT_MODE), default: ASSIGNMENT_MODE.MANUAL },
      currentChefId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      assignedAt: { type: Date, default: null },
    },

    timers: {
      queuedAt: { type: Date, default: () => new Date() },
      assignedAt: { type: Date, default: null },
      preparingAt: { type: Date, default: null },
      readyAt: { type: Date, default: null },
      servedAt: { type: Date, default: null },
    },

    sla: {
      targetSeconds: { type: Number, default: null },
      breached: { type: Boolean, default: false },
      breachedAt: { type: Date, default: null },
    },

    timeline: { type: [timelineSchema], default: [] },
    recallCount: { type: Number, default: 0 },
    refireCount: { type: Number, default: 0 },

    version: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// One entry per order (idempotent enqueue backstop).
queueEntrySchema.index({ orderId: 1 }, { unique: true });
// Hot board query: active queue for a branch, priority (desc) then FIFO.
queueEntrySchema.index({ branchId: 1, status: 1, priorityWeight: -1, 'timers.queuedAt': 1 });
// Station board.
queueEntrySchema.index({ branchId: 1, stationIds: 1, status: 1 });
// SLA + reporting.
queueEntrySchema.index({ branchId: 1, 'sla.breached': 1 });
queueEntrySchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
queueEntrySchema.index({ 'assignment.currentChefId': 1, status: 1 });

export const KitchenQueueEntry =
  mongoose.models.KitchenQueueEntry || mongoose.model('KitchenQueueEntry', queueEntrySchema);

export default KitchenQueueEntry;
