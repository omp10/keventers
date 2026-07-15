/**
 * Storage provider contract. Future modules depend ONLY on this abstraction and
 * never on a concrete SDK, so the backend (local/Cloudinary/S3) is swappable.
 *
 * @typedef {object} StoredFile
 * @property {string} key        Provider-specific identifier / path.
 * @property {string} url        Publicly resolvable URL (when applicable).
 * @property {number} [size]
 * @property {string} [mimeType]
 *
 * @typedef {object} UploadInput
 * @property {Buffer} buffer
 * @property {string} filename
 * @property {string} [mimeType]
 * @property {string} [folder]
 */
export class StorageProvider {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @param {UploadInput} input @returns {Promise<StoredFile>} */
  async upload(input) {
    throw new Error('upload() not implemented');
  }

  /** @param {string} key @returns {Promise<Buffer>} */
  async download(key) {
    throw new Error('download() not implemented');
  }

  /** @param {string} key @returns {Promise<boolean>} */
  async delete(key) {
    throw new Error('delete() not implemented');
  }

  /** @param {string} key @returns {string} */
  getUrl(key) {
    throw new Error('getUrl() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export default StorageProvider;
