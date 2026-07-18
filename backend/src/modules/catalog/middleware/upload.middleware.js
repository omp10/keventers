import multer from 'multer';

/**
 * In-memory multipart handling for catalog imagery. Files are held as buffers
 * and streamed to the Storage Platform by the service — never written to disk
 * here. Size/count limits guard the endpoints. Only image mime types are
 * accepted for product/category/add-on images.
 */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter(_req, file, cb) {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Only image uploads are allowed'));
  },
});

/** Up to 10 product gallery images under the `images` field. */
export const productImagesUpload = imageUpload.array('images', 10);

/** A single image under the `image` field (category / add-on). */
export const singleImageUpload = imageUpload.single('image');

/** CSV/Excel import file (separate limits, any type — parsed later). */
const dataUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
export const importFileUpload = dataUpload.single('file');

export default imageUpload;
