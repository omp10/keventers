import mongoose from 'mongoose';

import { config } from '#config';
import { logger } from '#core/logging/logger.js';

/**
 * Owns the single Mongoose connection for the whole process. Repositories are
 * the only layer that use models bound to this connection — no service or
 * controller touches Mongoose directly.
 */
class MongoConnection {
  #connected = false;

  async connect() {
    if (this.#connected) return mongoose.connection;

    mongoose.set('strictQuery', true);

    this.#bindEventListeners();

    // Spread the frozen config so Mongoose can safely populate defaults on it.
    await mongoose.connect(config.database.uri, { ...config.database.options });
    this.#connected = true;
    logger().info({ dbName: config.database.dbName }, 'MongoDB connected');
    return mongoose.connection;
  }

  #bindEventListeners() {
    const conn = mongoose.connection;
    conn.on('error', (err) => logger().error({ err }, 'MongoDB connection error'));
    conn.on('disconnected', () => {
      this.#connected = false;
      logger().warn('MongoDB disconnected');
    });
    conn.on('reconnected', () => {
      this.#connected = true;
      logger().info('MongoDB reconnected');
    });
  }

  /** readyState === 1 means an active, usable connection. */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /** Ping used by the readiness probe. */
  async ping() {
    if (!this.isConnected()) return false;
    await mongoose.connection.db.admin().ping();
    return true;
  }

  getConnection() {
    return mongoose.connection;
  }

  async disconnect() {
    if (!this.#connected) return;
    await mongoose.connection.close(false);
    this.#connected = false;
    logger().info('MongoDB connection closed');
  }
}

export const mongoConnection = new MongoConnection();
export default mongoConnection;
