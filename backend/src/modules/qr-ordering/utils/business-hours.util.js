/**
 * Business-hours evaluation. Given a branch's weekly hours and its timezone,
 * decide whether it is open at a given instant. Pure + deterministic (accepts an
 * explicit `now`), so it is trivially testable. Uses `Intl` (no tz dependency)
 * to resolve the local weekday + time in the branch timezone.
 *
 * businessHours entry shape: { day, isOpen, open: 'HH:mm', close: 'HH:mm' }
 * (as produced by the organization module's businessHours sub-schema).
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function localParts(now, timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase() ?? '';
    let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    if (hour === 24) hour = 0; // some engines emit 24 for midnight
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return { weekday, minutes: hour * 60 + minute };
  } catch {
    // Invalid timezone → fall back to UTC.
    const d = now;
    return { weekday: DAY_NAMES[d.getUTCDay()], minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
}

function toMinutes(hhmm, fallback) {
  if (typeof hhmm !== 'string') return fallback;
  const [h, m] = hhmm.split(':').map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
}

/**
 * @param {Array<{day:string,isOpen:boolean,open:string,close:string}>} businessHours
 * @param {string} timezone  IANA timezone (e.g. 'Asia/Kolkata').
 * @param {Date} [now]
 * @returns {{ open: boolean, reason: string }}
 */
export function isBranchOpen(businessHours, timezone, now = new Date()) {
  // Unconfigured hours → treat as always open (24/7) rather than blocking.
  if (!Array.isArray(businessHours) || businessHours.length === 0) {
    return { open: true, reason: 'no hours configured (24/7)' };
  }
  const { weekday, minutes } = localParts(now, timezone);
  const today = businessHours.find((h) => h.day === weekday);
  if (!today || today.isOpen === false) {
    return { open: false, reason: 'closed today' };
  }
  const start = toMinutes(today.open, 0);
  const end = toMinutes(today.close, 24 * 60);

  // Overnight window (e.g. 18:00 → 02:00) spans midnight.
  const withinWindow =
    end > start ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;

  return withinWindow ? { open: true, reason: 'open' } : { open: false, reason: 'outside hours' };
}
