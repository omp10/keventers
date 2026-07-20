import { logger } from '#core/logging/logger.js';

/**
 * IMAGE OPTIMIZER — shrink an upload before it is ever stored.
 *
 * Banners were being served exactly as uploaded: 2 MB PNG screenshots straight
 * off a designer's machine. Caching headers were already correct, so repeat
 * views were fine — but the FIRST view of the homepage had to pull ~2 MB per
 * banner over the wire, which is the entire "images take forever to load"
 * complaint. Fixing it at upload time fixes it once, for every surface that
 * ever renders the image, instead of every consumer having to cope.
 *
 * WebP at quality 82 is visually indistinguishable for photographic content at
 * roughly a tenth the bytes of an equivalent PNG. Images are downscaled to a
 * sane maximum edge — nothing on this site renders wider than a full-bleed
 * banner, so anything larger is pure waste.
 */

/** Max edge per folder. A banner is full-bleed; a category tile never is. */
const MAX_WIDTH = { banners: 1920, categories: 800, products: 1200, platform: 1600 };
const DEFAULT_MAX_WIDTH = 1600;
const QUALITY = 82;

/** Animated GIFs and SVGs must pass through untouched (animation / vectors). */
const PASSTHROUGH = new Set(['image/svg+xml', 'image/gif']);

/**
 * sharp is loaded LAZILY and its failure is survivable.
 *
 * It ships a native binary, and production deploys run `npm ci --ignore-scripts`
 * (which is why bcrypt needs an explicit rebuild there). A top-level
 * `import sharp` would make this module — and therefore media.service, and
 * therefore the whole organization module — fail to load if that binary were
 * ever missing, taking the API down at boot. Compressing a banner is a
 * nice-to-have; serving orders is not. If sharp cannot load we store the
 * original and say so once.
 */
let sharpPromise = null;
function loadSharp() {
  sharpPromise ??= import('sharp')
    .then((m) => m.default)
    .catch((err) => {
      logger().error({ err }, 'sharp unavailable — images will be stored unoptimized');
      return null;
    });
  return sharpPromise;
}

/**
 * @param {{buffer: Buffer, mimetype?: string, originalname?: string}} file
 * @param {string} folder
 * @returns {Promise<{buffer: Buffer, mimeType: string, filename: string, meta: object}>}
 */
export async function optimizeImage(file, folder = 'platform') {
  const original = file.buffer;
  const mimeType = file.mimetype ?? 'application/octet-stream';
  const filename = file.originalname ?? 'upload';

  if (PASSTHROUGH.has(mimeType)) {
    return { buffer: original, mimeType, filename, meta: { skipped: 'passthrough' } };
  }

  const sharp = await loadSharp();
  if (!sharp) return { buffer: original, mimeType, filename, meta: { skipped: 'sharp_unavailable' } };

  try {
    const image = sharp(original, { failOn: 'none' });
    const { width, height } = await image.metadata();
    const maxWidth = MAX_WIDTH[folder] ?? DEFAULT_MAX_WIDTH;

    const buffer = await image
      .rotate() // honour EXIF orientation, else phone photos arrive sideways
      .resize({ width: Math.min(width || maxWidth, maxWidth), withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Never ship a "optimized" file that is somehow bigger than the original.
    if (buffer.length >= original.length) {
      return { buffer: original, mimeType, filename, meta: { skipped: 'no_gain', originalBytes: original.length } };
    }

    const webpName = filename.replace(/\.[^.]+$/, '') + '.webp';
    const meta = {
      originalBytes: original.length,
      optimizedBytes: buffer.length,
      savedPercent: Math.round((1 - buffer.length / original.length) * 100),
      dimensions: `${width ?? '?'}x${height ?? '?'}`,
    };
    logger().info({ folder, ...meta }, 'Image optimized');
    return { buffer, mimeType: 'image/webp', filename: webpName, meta };
  } catch (err) {
    // A corrupt or exotic file must still upload — worse compression beats a
    // failed upload for someone trying to publish a banner.
    logger().warn({ err }, 'Image optimization failed; storing the original');
    return { buffer: original, mimeType, filename, meta: { skipped: 'error' } };
  }
}

export default optimizeImage;
