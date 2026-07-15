import { config } from '#config';

import { StorageProvider } from './storage.interface.js';

/**
 * S3 storage ADAPTER INTERFACE.
 *
 * Per the phase scope, only the interface is provided — no AWS SDK dependency is
 * pulled in. To enable S3: `npm i @aws-sdk/client-s3`, then implement these
 * methods against an S3Client built from config.storage.s3. The shape matches
 * the other providers so wiring it into the factory is a one-line change.
 */
export class S3StorageProvider extends StorageProvider {
  constructor(options = config.storage.s3) {
    super();
    this.options = options;
  }

  /* eslint-disable class-methods-use-this, no-unused-vars */
  async upload(_input) {
    throw new Error('S3StorageProvider.upload not implemented — bind @aws-sdk/client-s3');
  }

  async download(_key) {
    throw new Error('S3StorageProvider.download not implemented — bind @aws-sdk/client-s3');
  }

  async delete(_key) {
    throw new Error('S3StorageProvider.delete not implemented — bind @aws-sdk/client-s3');
  }

  getUrl(key) {
    const { endpoint, bucket, region } = this.options;
    if (endpoint) return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
  /* eslint-enable class-methods-use-this, no-unused-vars */
}

export default S3StorageProvider;
