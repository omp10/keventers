import { roundHalfUp } from './rounding.js';

/**
 * Money value object — the ONLY correct way to represent money in the platform.
 * Amounts are stored as integer MINOR units (paise for INR, cents for USD), so
 * there is NO floating-point money anywhere in Cart, Orders, Payments or
 * Refunds. Immutable; every operation returns a new Money. Currency mismatches
 * throw. Percentages are expressed in BASIS POINTS (bps): 1% = 100 bps, 18% =
 * 1800 bps — also integers, avoiding fractional-percent float drift.
 *
 * Zero-decimal currencies (e.g. JPY) would use a different exponent; a per-
 * currency exponent table is a future extension. Today the platform is INR
 * (exponent 2), matching the catalog defaults.
 */
const MINOR_PER_MAJOR = 100;

export class Money {
  /**
   * @param {number} amount  Integer minor units.
   * @param {string} currency
   */
  constructor(amount, currency = 'INR') {
    if (!Number.isInteger(amount)) {
      throw new TypeError(`Money amount must be an integer (minor units), got ${amount}`);
    }
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  static of(minorUnits, currency = 'INR') {
    return new Money(minorUnits, currency);
  }

  static zero(currency = 'INR') {
    return new Money(0, currency);
  }

  /** Build from a MAJOR-unit value (e.g. 199.50 → 19950 paise). Use only at the
   * boundary where catalog prices (major, 2-decimal) enter the money domain. */
  static fromMajor(major, currency = 'INR') {
    return new Money(roundHalfUp(Number(major) * MINOR_PER_MAJOR), currency);
  }

  /** Sum a list of Money (empty → zero in the given currency). */
  static sum(list = [], currency = 'INR') {
    return list.reduce((acc, m) => acc.add(m), Money.zero(currency));
  }

  #assertSame(other) {
    if (!(other instanceof Money)) throw new TypeError('Expected a Money instance');
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  add(other) {
    this.#assertSame(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other) {
    this.#assertSame(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  /** Multiply by an integer factor (e.g. quantity). */
  multiply(factor) {
    if (!Number.isInteger(factor)) throw new TypeError('Money.multiply requires an integer factor');
    return new Money(this.amount * factor, this.currency);
  }

  /** A percentage of this amount, `bps` in basis points, rounded to minor units. */
  percentageBps(bps, round = roundHalfUp) {
    return new Money(round((this.amount * bps) / 10000), this.currency);
  }

  negate() {
    return new Money(-this.amount, this.currency);
  }

  /** Never below `floor` (used to stop a discount exceeding the subtotal). */
  clampMin(floor) {
    this.#assertSame(floor);
    return this.amount < floor.amount ? floor : this;
  }

  /** Never above `ceil` (used to cap a discount at maxDiscount). */
  clampMax(ceil) {
    this.#assertSame(ceil);
    return this.amount > ceil.amount ? ceil : this;
  }

  min(other) {
    this.#assertSame(other);
    return this.amount <= other.amount ? this : other;
  }

  max(other) {
    this.#assertSame(other);
    return this.amount >= other.amount ? this : other;
  }

  isZero() {
    return this.amount === 0;
  }
  isNegative() {
    return this.amount < 0;
  }
  isPositive() {
    return this.amount > 0;
  }

  compareTo(other) {
    this.#assertSame(other);
    return this.amount - other.amount;
  }

  equals(other) {
    return other instanceof Money && other.currency === this.currency && other.amount === this.amount;
  }

  toMajor() {
    return this.amount / MINOR_PER_MAJOR;
  }

  /** Transport shape — always includes the raw minor amount (the source of truth). */
  toJSON() {
    return {
      amount: this.amount,
      currency: this.currency,
      major: this.toMajor(),
    };
  }

  toString() {
    return `${this.currency} ${this.toMajor().toFixed(2)}`;
  }
}

export default Money;
