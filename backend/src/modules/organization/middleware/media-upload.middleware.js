import multer from 'multer';

/**
 * In-memory multipart handling for platform/brand imagery (banners, category
 * tiles, kitchen covers). Files are held as buffers and streamed to the Storage
 * Platform by the service — never written to disk here.
 */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Only image uploads are allowed'));
  },
});

/** A single image under the `file` field. */
export const singleMediaUpload = imageUpload.single('file');

export default imageUpload;
