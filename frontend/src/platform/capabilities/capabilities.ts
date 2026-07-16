import { isCameraSupported, isNativeScanSupported } from '@/platform/scanner';
import { isGeolocationSupported } from '@/platform/location';

/**
 * CAPABILITY PLATFORM — the single source of truth for what the current device
 * can DO (not how wide its screen is). Business pages MUST consume this instead of
 * reading `window.innerWidth` / `navigator.userAgent`. Experiences are chosen from
 * capabilities: a phone with a camera leads with the scanner; a desktop with a
 * mouse leads with discovery; a tablet decides from its capabilities.
 *
 * The platform itself is the ONLY place allowed to read matchMedia/navigator for
 * this purpose — it centralizes and makes it reactive + testable.
 */
export type FormFactor = 'handset' | 'tablet' | 'desktop';
export type PrimaryInput = 'touch' | 'pointer';
export type EntrySurface = 'scanner' | 'discovery';

export type Capabilities = {
  camera: boolean;
  barcodeDetector: boolean;
  geolocation: boolean;
  touch: boolean;
  hover: boolean;
  finePointer: boolean;
  reducedMotion: boolean;
  online: boolean;
  /** Running as an installed PWA. */
  standalone: boolean;
  formFactor: FormFactor;
  primaryInput: PrimaryInput;
  /** The device's preferred entry experience, derived from the above. */
  entrySurface: EntrySurface;
};

const hasWindow = typeof window !== 'undefined';
const mm = (q: string): boolean => (hasWindow && typeof window.matchMedia === 'function' ? window.matchMedia(q).matches : false);

// The media queries we react to. Width is used ONLY here (inside the platform) to
// separate tablet from handset — business code never sees it.
const QUERIES = [
  '(hover: hover)',
  '(pointer: fine)',
  '(pointer: coarse)',
  '(prefers-reduced-motion: reduce)',
  '(min-width: 820px)',
  '(display-mode: standalone)',
];

function deriveFormFactor(touch: boolean, hover: boolean, finePointer: boolean, wide: boolean): FormFactor {
  if (hover && finePointer) return 'desktop';
  if (touch) return wide ? 'tablet' : 'handset';
  return 'desktop';
}

export function detectCapabilities(): Capabilities {
  const hover = mm('(hover: hover)');
  const finePointer = mm('(pointer: fine)');
  const coarse = mm('(pointer: coarse)');
  const wide = mm('(min-width: 820px)');
  const touch = coarse || (hasWindow && (navigator.maxTouchPoints ?? 0) > 0);
  const camera = isCameraSupported();
  const formFactor = deriveFormFactor(touch, hover, finePointer, wide);
  const primaryInput: PrimaryInput = coarse && !finePointer ? 'touch' : 'pointer';

  // Entry surface: handset → scanner-first (if it can scan); desktop → discovery;
  // tablet decides from capability (camera present → scanner, else discovery).
  let entrySurface: EntrySurface = 'discovery';
  if (formFactor === 'handset') entrySurface = camera ? 'scanner' : 'discovery';
  else if (formFactor === 'tablet') entrySurface = camera && touch ? 'scanner' : 'discovery';

  return {
    camera,
    barcodeDetector: isNativeScanSupported(),
    geolocation: isGeolocationSupported(),
    touch,
    hover,
    finePointer,
    reducedMotion: mm('(prefers-reduced-motion: reduce)'),
    online: hasWindow ? navigator.onLine : true,
    standalone: mm('(display-mode: standalone)') || (hasWindow && (navigator as { standalone?: boolean }).standalone === true),
    formFactor,
    primaryInput,
    entrySurface,
  };
}

// ---- Reactive store (module singleton) --------------------------------------
let snapshot = detectCapabilities();
let serialized = JSON.stringify(snapshot);
const listeners = new Set<() => void>();

function recompute() {
  const next = detectCapabilities();
  const nextSerialized = JSON.stringify(next);
  if (nextSerialized === serialized) return; // stable reference when unchanged
  snapshot = next;
  serialized = nextSerialized;
  listeners.forEach((l) => l());
}

let wired = false;
function wire() {
  if (wired || !hasWindow || typeof window.matchMedia !== 'function') return;
  wired = true;
  for (const q of QUERIES) {
    const mql = window.matchMedia(q);
    // addEventListener is the modern API; older Safari uses addListener.
    if (mql.addEventListener) mql.addEventListener('change', recompute);
    else mql.addListener?.(recompute);
  }
  window.addEventListener('online', recompute);
  window.addEventListener('offline', recompute);
}

export const capabilityStore = {
  get: () => snapshot,
  subscribe: (fn: () => void) => {
    wire();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Force a re-detect (e.g. after a permission grant reveals a camera). */
  refresh: recompute,
};
