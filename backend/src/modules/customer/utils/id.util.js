/** Normalize a Mongoose doc / DTO to its string id (`id` or `_id`). */
export function entityId(doc) {
  if (!doc) return null;
  if (doc.id) return String(doc.id);
  if (doc._id) return String(doc._id);
  return null;
}

/** Normalize any ObjectId-ish value to a string (or null). */
export function oid(v) {
  return v == null ? null : String(v);
}
