import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { config } from '#config';

import { StorageProvider } from './storage.interface.js';

/**
 * Local filesystem storage provider. Suitable for development and single-node
 * deployments. Files are written under STORAGE_LOCAL_DIR and served via
 * STORAGE_PUBLIC_BASE_URL.
 */
export class LocalStorageProvider extends StorageProvider {
  constructor(options = config.storage.local) {
    super();
    this.dir = options.dir;
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/$/, '');
  }

  #safeKey(folder, filename) {
    const ext = path.extname(filename);
    const unique = `${Date.now()}-${randomUUID()}${ext}`;
    // Prevent path traversal from folder input.
    const safeFolder = String(folder || '').replace(/[^a-zA-Z0-9/_-]/g, '');
    return path.posix.join(safeFolder, unique);
  }

  async upload({ buffer, filename, mimeType, folder }) {
    const key = this.#safeKey(folder, filename);
    const absPath = path.join(this.dir, key);
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, buffer);
    return {
      key,
      url: this.getUrl(key),
      size: buffer.length,
      mimeType,
      checksum: createHash('md5').update(buffer).digest('hex'),
    };
  }

  async download(key) {
    return readFile(path.join(this.dir, key));
  }

  async delete(key) {
    await rm(path.join(this.dir, key), { force: true });
    return true;
  }

  getUrl(key) {
    return `${this.publicBaseUrl}/${key}`;
  }
}

export default LocalStorageProvider;
