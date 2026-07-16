/**
 * GUEST room authorization. Guests (table-session tokens) may only join rooms
 * that belong to THEIR session — which rooms those are is business knowledge,
 * so modules register a guard per room TYPE and the platform just consults it:
 *
 *   registerSocketRoomGuard('order', async (id, guest) => <owns it?>)
 *
 * Staff/customer principals are not routed through these guards (their access
 * token already gates the data the events describe).
 */
const guards = new Map();

/**
 * @param {string} type e.g. 'order'
 * @param {(id: string, guest: object) => boolean | Promise<boolean>} guard
 */
export function registerSocketRoomGuard(type, guard) {
  guards.set(type, guard);
}

/** May this guest join `room` (`type:id`)? Fail closed on any error. */
export async function isGuestRoomAllowed(room, guest) {
  const [type, id] = String(room).split(':');
  // A guest may always listen to their own session's room.
  if (type === 'session' && id === guest?.sessionId) return true;
  const guard = guards.get(type);
  if (!guard) return false;
  try {
    return Boolean(await guard(id, guest));
  } catch {
    return false;
  }
}
