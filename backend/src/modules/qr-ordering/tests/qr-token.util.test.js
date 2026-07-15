import { describe, expect, it } from 'vitest';

import {
  buildQrCode,
  generateQrCredential,
  parseQrCode,
  rotateQrCredential,
  signQrToken,
  verifyQrSignature,
} from '../utils/qr-token.util.js';

describe('qr-token util (secure QR credential)', () => {
  it('generates a code that parses + verifies', () => {
    const cred = generateQrCredential(1);
    const parsed = parseQrCode(cred.code);
    expect(parsed).toMatchObject({ token: cred.token, secretVersion: 1 });
    expect(verifyQrSignature(parsed.token, parsed.secretVersion, parsed.signature)).toBe(true);
  });

  it('rejects a tampered token (signature mismatch)', () => {
    const cred = generateQrCredential(1);
    const parsed = parseQrCode(cred.code);
    expect(verifyQrSignature(`${parsed.token}x`, parsed.secretVersion, parsed.signature)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const cred = generateQrCredential(1);
    const parsed = parseQrCode(cred.code);
    const badSig = parsed.signature.slice(0, -2) + (parsed.signature.endsWith('A') ? 'BB' : 'AA');
    expect(verifyQrSignature(parsed.token, parsed.secretVersion, badSig)).toBe(false);
  });

  it('invalidates old codes after a secret rotation (version bump)', () => {
    const cred = generateQrCredential(1);
    const rotated = rotateQrCredential(cred.token, 2);
    // Same token, new signature for v2.
    expect(rotated.token).toBe(cred.token);
    expect(verifyQrSignature(cred.token, 2, rotated.signature)).toBe(true);
    // The OLD v1 signature no longer matches v2.
    const oldParsed = parseQrCode(cred.code);
    expect(verifyQrSignature(oldParsed.token, 2, oldParsed.signature)).toBe(false);
  });

  it('returns null for malformed codes', () => {
    expect(parseQrCode('garbage')).toBeNull();
    expect(parseQrCode('a.b')).toBeNull();
    expect(parseQrCode(123)).toBeNull();
  });

  it('signatures are unguessable across tokens', () => {
    const a = signQrToken('token-a', 1);
    const b = signQrToken('token-b', 1);
    expect(a).not.toBe(b);
    expect(buildQrCode('t', 1, a)).toBe(`t.1.${a}`);
  });
});
