import { config } from '#config';
import { logger } from '#core/logging/logger.js';

import { CloudinaryStorageProvider } from './cloudinary.storage.js';
import { LocalStorageProvider } from './local.storage.js';
import { S3StorageProvider } from './s3.storage.js';

/**
 * Selects the storage provider from config.storage.driver. Business modules
 * request the abstraction via `getStorage()` and remain unaware of the backend.
 */
export function createStorageProvider(driver = config.storage.driver) {
  switch (driver) {
    case 'cloudinary':
      return new CloudinaryStorageProvider();
    case 's3':
      return new S3StorageProvider();
    case 'local':
    default:
      return new LocalStorageProvider();
  }
}

let instance = null;

/** Lazily-built singleton provider for the configured driver. */
export function getStorage() {
  if (!instance) {
    instance = createStorageProvider();
    logger().info({ driver: config.storage.driver }, 'Storage provider initialized');
  }
  return instance;
}

export default getStorage;
