import cloudinaryPkg from 'cloudinary';

import { config } from '#config';

import { StorageProvider } from './storage.interface.js';

// Robust CJS/ESM interop: cloudinary exposes its API under `.v2`.
const cloudinary = cloudinaryPkg.v2 ?? cloudinaryPkg;

/**
 * Cloudinary storage provider. Configured lazily from config.storage.cloudinary;
 * throws a clear error if credentials are missing when used.
 */
export class CloudinaryStorageProvider extends StorageProvider {
  constructor(options = config.storage.cloudinary) {
    super();
    this.options = options;
    this.configured = Boolean(options.cloudName && options.apiKey && options.apiSecret);
    if (this.configured) {
      cloudinary.config({
        cloud_name: options.cloudName,
        api_key: options.apiKey,
        api_secret: options.apiSecret,
        secure: true,
      });
    }
  }

  #ensure() {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured (missing cloud name / api key / secret)');
    }
  }

  async upload({ buffer, folder, mimeType }) {
    this.#ensure();
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder || undefined,
      resource_type: 'auto',
    });
    return {
      key: result.public_id,
      url: result.secure_url,
      size: result.bytes,
      mimeType,
    };
  }

  async download() {
    // Cloudinary assets are fetched via their URL; direct byte download is
    // intentionally not implemented here.
    throw new Error('Use getUrl() to fetch Cloudinary assets');
  }

  async delete(key) {
    this.#ensure();
    const res = await cloudinary.uploader.destroy(key);
    return res.result === 'ok';
  }

  getUrl(key) {
    this.#ensure();
    return cloudinary.url(key, { secure: true });
  }
}

export default CloudinaryStorageProvider;
