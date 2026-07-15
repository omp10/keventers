import { BaseService } from '#core/service/base.service.js';
import { getStorage } from '#platform/storage/index.js';

import { STORAGE_FOLDERS } from '../constants/qr.constants.js';
import { qrcodeRenderer } from '../interfaces/qr-renderer.interface.js';

/**
 * QR image generation + storage. Renders the scannable URL into a PNG (via the
 * pluggable QrRenderer) and persists it through the Storage Platform — never
 * touching Cloudinary/S3 directly, and never generating QR logic in a
 * controller. Image generation is BEST-EFFORT: if no renderer/storage is
 * available the QR still functions from its token/URL (image stays null).
 */
export class QrImageService extends BaseService {
  constructor({ renderer = qrcodeRenderer, storage, eventBus } = {}) {
    super({ name: 'qr.image', eventBus });
    this.renderer = renderer;
    this.storage = storage ?? null;
  }

  #storage() {
    return this.storage ?? getStorage();
  }

  /**
   * Render + store the QR image for a scan URL.
   * @returns {Promise<{ imageUrl: string|null, imageKey: string|null }>}
   */
  async generateAndStore({ scanUrl, filename }) {
    try {
      const buffer = await this.renderer.toBuffer(scanUrl);
      const stored = await this.#storage().upload({
        buffer,
        filename: `${filename}.png`,
        mimeType: 'image/png',
        folder: STORAGE_FOLDERS.QR_IMAGES,
      });
      return { imageUrl: stored.url, imageKey: stored.key };
    } catch (err) {
      // Best-effort: the QR is fully usable from its token/URL without an image.
      this.logger.warn({ err }, 'QR image generation failed (continuing without image)');
      return { imageUrl: null, imageKey: null };
    }
  }

  async remove(imageKey) {
    if (!imageKey) return;
    try {
      await this.#storage().delete(imageKey);
    } catch (err) {
      this.logger.warn({ err, imageKey }, 'QR image delete failed (continuing)');
    }
  }
}

export const qrImageService = new QrImageService();
export default qrImageService;
