import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * OrderCounter: an atomic per-(restaurant, day) sequence for enterprise order
 * numbers. A single `findOneAndUpdate($inc)` per order guarantees a unique,
 * gap-tolerant, monotonically increasing sequence without a hot document or a
 * distributed lock. `key` is `${restaurantId}:${YYYYMMDD}`.
 */
const orderCounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const OrderCounter =
  mongoose.models.OrderCounter || mongoose.model('OrderCounter', orderCounterSchema);

export default OrderCounter;
