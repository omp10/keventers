import { transactionManager } from '#core/repository/transaction.manager.js';

/**
 * Service-layer transaction facade. Business services wrap multi-repository
 * writes in `withTransaction(async (session) => { ... })` to get atomicity,
 * passing `{ session }` into repository calls.
 */
export const TransactionWrapper = {
  /**
   * @template T
   * @param {(session: import('mongoose').ClientSession) => Promise<T>} work
   * @returns {Promise<T>}
   */
  withTransaction(work) {
    return transactionManager.run(work);
  },
};

export default TransactionWrapper;
