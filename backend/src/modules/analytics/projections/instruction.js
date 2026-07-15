/**
 * Projection INSTRUCTION builders. Updaters are PURE functions that translate an
 * (enriched) domain event into a list of these instructions; the ProjectionService
 * applies them (fanning bucket instructions across every maintained granularity).
 * This keeps the projection math testable in isolation and makes adding a metric
 * a data change, not a control-flow change.
 *
 * @typedef {{ kind:'bucket', domain:string, inc:object, hist?:object }} BucketInstruction
 * @typedef {{ kind:'entity', domain:string, entityType:string, entityId:string, name?:string, inc:object }} EntityInstruction
 */

/** A time-bucketed counter increment (fanned across hour/day/week/month/year/all). */
export function bucket(domain, inc, hist = null) {
  return { kind: 'bucket', domain, inc, hist };
}

/** A per-entity counter increment (leaderboards). */
export function entity(domain, entityType, entityId, inc, name = null) {
  return { kind: 'entity', domain, entityType, entityId: String(entityId), inc, name };
}
