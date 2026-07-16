import { createHash, randomInt } from 'node:crypto';

import { config } from '#config';
import { BaseService } from '#core/service/base.service.js';
import { TooManyRequestsError, UnauthorizedError, ValidationError } from '#core/errors/app-error.js';

import { OTP_PURPOSE, OtpChallenge } from '../models/otp-challenge.model.js';

/* Policy — deliberately conservative; SMS costs money and codes are guessable. */
const CODE_LENGTH = 6;
const TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;

/** E.164-ish normalization so "+91 98 000 00100" and "+919800000100" are one identity. */
export function normalizePhone(raw) {
  const trimmed = String(raw ?? '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new ValidationError('Enter a valid phone number');
  }
  // Keep an explicit country code when given; otherwise assume the default.
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

const hashCode = (phone, code) => createHash('sha256').update(`${phone}:${code}`).digest('hex');
const seconds = (from, to) => Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 1000));

/**
 * OTP CHALLENGES — issue and verify one-time phone codes.
 *
 * This owns the security policy (hashing, expiry, attempt cap, resend cooldown)
 * and nothing else: it does NOT know about users or sessions. `auth.service`
 * composes it with identity to produce a login. Delivery is pluggable — today it
 * logs (and echoes the code outside production so the flow is testable without
 * an SMS provider); wiring a real sender is a one-method change.
 */
export class OtpService extends BaseService {
  constructor({ challenges = OtpChallenge, eventBus, logger } = {}) {
    super({ name: 'identity.otp', eventBus });
    this.challenges = challenges;
    this.log = logger ?? null;
  }

  /** Outside production the code is returned to the caller so the flow is usable. */
  get #echoCode() {
    return config.server.env !== 'production';
  }

  /**
   * Send (or resend) a code to a phone.
   * @returns {Promise<{phone: string, expiresInSeconds: number, resendInSeconds: number, devCode?: string}>}
   */
  async request(rawPhone, purpose = OTP_PURPOSE.LOGIN) {
    const phone = normalizePhone(rawPhone);
    const now = new Date();
    const existing = await this.challenges.findOne({ phone, purpose });

    if (existing && !existing.consumedAt) {
      const nextAllowed = new Date(existing.lastSentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
      if (nextAllowed > now) {
        throw new TooManyRequestsError(
          `Please wait ${seconds(now, nextAllowed)}s before requesting another code`,
        );
      }
      if (existing.expiresAt > now && (existing.sendCount ?? 0) >= MAX_SENDS_PER_WINDOW) {
        throw new TooManyRequestsError('Too many codes requested. Try again in a few minutes.');
      }
    }

    const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
    const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);
    // A fresh code resets attempts; sendCount keeps climbing inside the window.
    const sendCount = existing && existing.expiresAt > now ? (existing.sendCount ?? 0) + 1 : 1;

    await this.challenges.updateOne(
      { phone, purpose },
      {
        $set: {
          codeHash: hashCode(phone, code),
          expiresAt,
          attempts: 0,
          lastSentAt: now,
          sendCount,
          consumedAt: null,
        },
      },
      { upsert: true },
    );

    await this.#deliver(phone, code);

    return {
      phone,
      expiresInSeconds: TTL_SECONDS,
      resendInSeconds: RESEND_COOLDOWN_SECONDS,
      ...(this.#echoCode ? { devCode: code } : {}),
    };
  }

  /**
   * Check a code and consume the challenge. Throws on invalid/expired/exhausted.
   * @returns {Promise<{phone: string}>}
   */
  async verify(rawPhone, code, purpose = OTP_PURPOSE.LOGIN) {
    const phone = normalizePhone(rawPhone);
    const now = new Date();
    const challenge = await this.challenges.findOne({ phone, purpose });

    if (!challenge || challenge.consumedAt) {
      throw new UnauthorizedError('Request a new code to continue');
    }
    if (challenge.expiresAt <= now) {
      throw new UnauthorizedError('That code has expired. Request a new one.');
    }
    if ((challenge.attempts ?? 0) >= MAX_ATTEMPTS) {
      throw new TooManyRequestsError('Too many incorrect attempts. Request a new code.');
    }

    if (challenge.codeHash !== hashCode(phone, String(code ?? '').trim())) {
      await this.challenges.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
      throw new UnauthorizedError('That code is incorrect');
    }

    // Single-use: consuming here means a replay of the same code cannot log in.
    await this.challenges.updateOne({ _id: challenge._id }, { $set: { consumedAt: now } });
    return { phone };
  }

  /**
   * Deliver the code. Replace this body with the SMS provider call — everything
   * else (policy, storage, verification) stays as-is.
   */
  async #deliver(phone, code) {
    this.log?.info?.({ phone }, 'OTP issued');
    if (this.#echoCode) {
      // eslint-disable-next-line no-console
      console.info(`[otp] ${phone} → ${code}`);
    }
  }
}

export const otpService = new OtpService();
export default otpService;
