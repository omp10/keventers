/** Normalize a document/DTO id from either `id` (virtual/DTO) or `_id`. */
export const entityId = (doc) => doc?.id ?? (doc?._id ? String(doc._id) : null);

export default entityId;
