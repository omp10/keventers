import mongoose from 'mongoose';

import { logger } from '#core/logging/logger.js';

/**
 * Wraps a unit of work in a MongoDB transaction (a "session"). The session is
 * passed to repository calls so multiple writes commit or roll back atomically.
 *
 * Usage (from a service):
 *   await transactionManager.run(async (session) => {
 *     await repoA.create(a, { session });
 *     await repoB.updateById(id, b, { session });
 *   });
 *
 * Requires a replica set / mongos. On standalone Mongo (common in local dev),
 * transactions are unavailable — callers should design writes to be safe
 * without them, or run against the docker-compose replica configuration.
 */
class TransactionManager {
  /**
   * @template T
   * @param {(session: import('mongoose').ClientSession) => Promise<T>} work
   * @returns {Promise<T>}
   */
  async run(work) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (err) {
      logger().error({ err }, 'Transaction aborted');
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

export const transactionManager = new TransactionManager();
export default transactionManager;
