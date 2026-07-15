export function entityId(doc) {
  if (!doc) return null;
  if (doc.id) return String(doc.id);
  if (doc._id) return String(doc._id);
  return null;
}

export function oid(v) {
  return v == null ? null : String(v);
}
