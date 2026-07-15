import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { config } from '#config';

/**
 * Secure QR token primitives. A QR code is NOT just a URL — it carries an
 * unguessable, HMAC-signed token so the gateway can detect tampering, support
 * secret rotation and reject forged/expired codes before any session is created.
 *
 * Scannable code:  `<token>.<version>.<signature>`
 *   - token      high-entropy random string (the DB lookup key; unguessable)
 *   - version    the QR's `secretVersion` (rotating it invalidates old codes)
 *   - signature  HMAC-SHA256( serverSecret , `<token>.<version>` )
 *
 * The signature is verified OFFLINE (server secret only) so millions of scans
 * never need a secret read; a Redis-cached, NON-sensitive validation record
 * supplies status/expiry/tenant. Rotating `secretVersion` mints a new signature
 * and invalidates every previously printed code; regenerating mints a new token.
 */

const b64url = (buf) => buf.toString('base64url');

/** Mint a new unguessable public lookup token (≈ 192 bits). */
export function newQrToken() {
  return b64url(randomBytes(24));
}

/** Compute the signature for a token at a given secret version. */
export function signQrToken(token, secretVersion = 1, deps = {}) {
  const serverSecret = deps.serverSecret ?? config.qr.tokenSecret;
  return createHmac('sha256', serverSecret).update(`${token}.${secretVersion}`).digest('base64url');
}

/** Build the scannable code embedded in the QR image. */
export function buildQrCode(token, secretVersion, signature) {
  return `${token}.${secretVersion}.${signature}`;
}

/** Split a scanned code into token / version / signature (null on malformed). */
export function parseQrCode(code) {
  if (typeof code !== 'string') return null;
  const parts = code.split('.');
  if (parts.length !== 3) return null;
  const [token, versionRaw, signature] = parts;
  const secretVersion = Number.parseInt(versionRaw, 10);
  if (!token || !signature || Number.isNaN(secretVersion)) return null;
  return { token, secretVersion, signature };
}

/** Constant-time signature verification (offline; server secret only). */
export function verifyQrSignature(token, secretVersion, signature, deps = {}) {
  const expected = signQrToken(token, secretVersion, deps);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature ?? ''));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Build the public scan URL the physical QR image encodes. */
export function buildScanUrl(code, deps = {}) {
  const base = (deps.publicBaseUrl ?? config.qr.publicBaseUrl).replace(/\/+$/, '');
  return `${base}/${code}`;
}

/**
 * Generate a fresh QR credential set (token + code + url) for a secret version.
 * Used on create / regenerate / rotate.
 */
export function generateQrCredential(secretVersion = 1, deps = {}) {
  const token = newQrToken();
  const signature = signQrToken(token, secretVersion, deps);
  const code = buildQrCode(token, secretVersion, signature);
  return { token, secretVersion, signature, code, scanUrl: buildScanUrl(code, deps) };
}

/** Recompute the code for an EXISTING token at a new secret version (rotation). */
export function rotateQrCredential(token, secretVersion, deps = {}) {
  const signature = signQrToken(token, secretVersion, deps);
  const code = buildQrCode(token, secretVersion, signature);
  return { token, secretVersion, signature, code, scanUrl: buildScanUrl(code, deps) };
}
