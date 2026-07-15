/** Normalize a document/DTO id from either `id` (virtual/DTO) or `_id`. */
export const entityId = (doc) => doc?.id ?? (doc?._id ? String(doc._id) : null);

/** Normalize an ObjectId-ish value to a string (or null). */
export const oid = (v) => (v ? String(v) : null);

export default entityId;
