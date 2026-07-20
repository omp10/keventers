import { describe, expect, it } from 'vitest';

import { isValidPhone, sanitizePhone } from './PhoneOtpForm';

/**
 * The field used to accept any text at any length and only checked `length >= 8`
 * before firing an OTP — so a 30-digit number, or letters, reached the API.
 */
describe('sanitizePhone', () => {
  it('caps a national number at 10 digits', () => {
    expect(sanitizePhone('72230778901234')).toBe('7223077890');
  });

  it('strips letters, spaces and punctuation', () => {
    expect(sanitizePhone('(722) 307-7890')).toBe('7223077890');
    expect(sanitizePhone('72abc23077890')).toBe('7223077890');
  });

  it('keeps a leading + and allows up to 15 digits (E.164)', () => {
    expect(sanitizePhone('+917223077890')).toBe('+917223077890');
    expect(sanitizePhone('+9172230778901234567')).toBe('+917223077890123');
  });

  it('drops a + that is not leading', () => {
    expect(sanitizePhone('722+3077890')).toBe('7223077890');
  });

  it('survives an empty field', () => {
    expect(sanitizePhone('')).toBe('');
  });
});

describe('isValidPhone — what may fire an OTP', () => {
  it('requires exactly 10 digits nationally', () => {
    expect(isValidPhone('7223077890')).toBe(true);
    expect(isValidPhone('722307789')).toBe(false);  // 9 — the old code allowed this
    expect(isValidPhone('12345678')).toBe(false);   // 8 — and this
  });

  it('accepts a plausible international number', () => {
    expect(isValidPhone('+917223077890')).toBe(true);
    expect(isValidPhone('+1234567')).toBe(false); // too short even for E.164
  });

  it('rejects an empty field', () => {
    expect(isValidPhone('')).toBe(false);
  });
});
