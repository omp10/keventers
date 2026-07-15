/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildStorageConfig(env) {
  return {
    driver: env.STORAGE_DRIVER,
    local: {
      dir: env.STORAGE_LOCAL_DIR,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
    },
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    },
    s3: {
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      endpoint: env.S3_ENDPOINT,
    },
  };
}
