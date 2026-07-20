import { BaseService } from '#core/service/base.service.js';
import { ValidationError } from '#core/errors/app-error.js';
import { getStorage } from '#platform/storage/index.js';

import { optimizeImage } from './image-optimizer.js';

/**
 * MEDIA — image ingestion for platform/brand content (banners, category tiles,
 * kitchen covers). The client NEVER talks to Cloudinary/S3 directly: it posts
 * the file here and the Storage Platform abstraction handles the provider, so
 * no storage keys ever reach the browser.
 */
export class MediaService extends BaseService {
  constructor({ storage = null, eventBus } = {}) {
    super({ name: 'org.media', eventBus });
    this._storage = storage;
  }

  get storage() {
    // Resolved lazily so the provider is built from live config at call time.
    return this._storage ?? getStorage();
  }

  /**
   * Store an uploaded image and return its public reference.
   * @param {{buffer: Buffer, originalname: string, mimetype: string}} file
   * @param {{folder?: string, actorId?: string|null}} [opts]
   */
  async uploadImage(file, { folder = 'platform', actorId = null } = {}) {
    if (!file?.buffer?.length) throw new ValidationError('An image file is required');

    // Compress BEFORE storing: a 2 MB PNG banner is ~2 MB on every first view
    // for every customer, forever. Doing it here means every surface that will
    // ever render this image benefits, without any of them knowing.
    const optimized = await optimizeImage(file, folder);

    const result = await this.storage.upload({
      buffer: optimized.buffer,
      filename: optimized.filename,
      mimeType: optimized.mimeType,
      folder,
    });

    this.audit.success('media.uploaded', { actorId, targetId: result.key });
    return {
      url: result.url,
      key: result.key,
      publicId: result.key,
      size: result.size,
      mimeType: result.mimeType,
    };
  }
}

export const mediaService = new MediaService();
export default mediaService;
