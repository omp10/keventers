import { randomBytes } from 'node:crypto';

/**
 * Human-safe external references. Never expose Mongo ids; these are the public,
 * shareable identifiers (referral codes, redemption codes).
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function randomCode(length) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** A shareable referral code, e.g. `KEV-7QXR4K`. */
export function referralCode(prefix = 'KEV') {
  return `${prefix}-${randomCode(6)}`;
}

/** A single-use redemption/reward voucher code, e.g. `RWD-3F9K2P8L`. */
export function redemptionCode() {
  return `RWD-${randomCode(8)}`;
}

/** Internal ledger reference (audit-friendly, unique-ish), e.g. `LP-a1b2c3d4`. */
export function ledgerReference() {
  return `LP-${randomBytes(6).toString('hex')}`;
}
