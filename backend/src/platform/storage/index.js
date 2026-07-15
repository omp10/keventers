/**
 * File storage platform — public barrel. Depend on `getStorage()` + the
 * StorageProvider abstraction, never a concrete provider.
 */
export { StorageProvider } from './storage.interface.js';
export { LocalStorageProvider } from './local.storage.js';
export { CloudinaryStorageProvider } from './cloudinary.storage.js';
export { S3StorageProvider } from './s3.storage.js';
export { getStorage, createStorageProvider } from './storage.factory.js';
