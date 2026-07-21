/**
 * Normalise the `platform` a client posts with its FCM token onto the two
 * surfaces we actually store: web and mobile.
 *
 * Clients are inconsistent — the customer PWA sends "web", the Android wrapper
 * sends "android", iOS sends "ios" — and treating an unrecognised value as web
 * would silently file a phone token under the browser field and push to the
 * wrong device. Anything explicitly mobile-ish maps to mobile; everything else
 * (including empty) falls back to web, which is the browser-first default here.
 */
const MOBILE = new Set(['mobile', 'android', 'ios', 'ipados', 'native', 'capacitor', 'cordova', 'expo']);

export function normalizePushPlatform(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return MOBILE.has(v) ? 'mobile' : 'web';
}

/** Trim a token and reject the string forms of "no token" clients send. */
export function normalizePushToken(value) {
  const v = String(value ?? '').trim();
  return v && v !== 'null' && v !== 'undefined' ? v : '';
}

export default normalizePushPlatform;
