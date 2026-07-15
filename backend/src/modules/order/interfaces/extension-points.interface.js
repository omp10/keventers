/**
 * Order module EXTENSION POINTS. Per the phase scope, these are contracts only —
 * Payments, Refunds and Split-Bill are NOT implemented here. Future modules
 * implement/consume them so the order aggregate stays the single source of
 * truth without this module depending on any of them.
 */

/**
 * Payment provider contract. A future Payments module drives an order's payment
 * lifecycle by calling OrderService.recordPaymentStatus(...) or by publishing
 * events the order consumes. The order stores only the STATUS (awaiting /
 * authorized / captured / failed) — never card/processing details.
 */
export class PaymentProvider {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {Promise<{ status: string, reference?: string }>} */
  async authorize(order, context) {
    throw new Error('PaymentProvider.authorize() not implemented');
  }
  /** @returns {Promise<{ status: string, reference?: string }>} */
  async capture(order, context) {
    throw new Error('PaymentProvider.capture() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

/**
 * Refund provider contract. A future Refunds/Payments module performs the actual
 * money movement; the order module only tracks the refund STATUS lifecycle
 * (requested → approved/rejected → completed) and emits events.
 */
export class RefundProvider {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {Promise<{ status: string, reference?: string }>} */
  async processRefund(order, context) {
    throw new Error('RefundProvider.processRefund() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

/**
 * Split-bill contract (RESERVED — not implemented). A future module will split
 * an order's pricing across multiple payers; the order carries a `splitBill`
 * flag today so the schema is forward-compatible.
 */
export class SplitBillStrategy {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {Promise<Array<{ payer: string, amount: number }>>} */
  async split(order, config) {
    throw new Error('SplitBillStrategy.split() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}
