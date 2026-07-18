import { capi } from '../catalog-scope';
import type { MediaImage } from '../types';

/**
 * MEDIA SERVICE — image upload through the BACKEND pipeline (Cloudinary via the
 * Storage Platform). The frontend uploads the file to the backend, which stores it
 * and returns the URL + publicId — no client-side Cloudinary keys. Uses the API
 * Platform's XHR upload (with progress).
 */
class MediaService {
  upload(file: File, onProgress?: (pct: number) => void): Promise<MediaImage> {
    const form = new FormData();
    form.append('file', file);
    return capi.upload<MediaImage>('/restaurant/media/upload', form, { onUploadProgress: onProgress });
  }
}

export const mediaService = new MediaService();
