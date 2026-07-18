import multer from 'multer';

/**
 * In-memory multipart handling for onboarding uploads. Files are held as
 * buffers and streamed to the storage platform by the service — never written
 * to disk here. Size/count limits guard the public endpoint.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
});

/** Public registration: one logo + up to 10 documents. */
export const registrationUpload = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'documents', maxCount: 10 },
]);

/** Single-image upload (e.g. restaurant logo). */
export const singleImageUpload = upload.single('image');

export default upload;
