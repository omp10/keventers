/**
 * Shared Mongoose schema conventions for identity models (DRY): enable
 * timestamps, expose a `deletedAt` soft-delete field (matched by
 * BaseRepository's default `deletedField`), and a clean JSON transform that
 * drops internals and never leaks secrets.
 */
export const baseSchemaOptions = Object.freeze({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      delete ret.passwordHash;
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
});

/** Soft-delete field definition to spread into a schema. */
export const softDeleteField = Object.freeze({
  deletedAt: { type: Date, default: null },
});
