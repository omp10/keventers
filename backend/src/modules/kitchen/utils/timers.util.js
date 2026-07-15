/**
 * Kitchen timer computation. Derives elapsed durations (seconds) from the stored
 * transition timestamps — the source of truth is always the timestamps, so the
 * durations are recomputable and never drift.
 */
const secondsBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)) : null);

/**
 * @param {{ queuedAt, assignedAt, preparingAt, readyAt, servedAt }} t
 * @param {Date} [now]  Used to compute live elapsed time for in-progress entries.
 */
export function computeTimers(t = {}, now = new Date()) {
  const end = t.servedAt ?? null;
  return {
    queuedAt: t.queuedAt ?? null,
    assignedAt: t.assignedAt ?? null,
    preparingAt: t.preparingAt ?? null,
    readyAt: t.readyAt ?? null,
    servedAt: t.servedAt ?? null,
    // Time waiting in queue before prep started.
    queueTimeSeconds: secondsBetween(t.queuedAt, t.preparingAt ?? (end ? null : now)),
    // Active preparation duration.
    prepTimeSeconds: secondsBetween(t.preparingAt, t.readyAt ?? (end ? null : now)),
    // Time sitting ready before being served.
    readyTimeSeconds: secondsBetween(t.readyAt, t.servedAt ?? (end ? null : now)),
    // End-to-end kitchen time (only final once served).
    totalKitchenTimeSeconds: secondsBetween(t.queuedAt, t.servedAt ?? now),
  };
}
