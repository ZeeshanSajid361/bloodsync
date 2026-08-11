/**
 * Multer middleware — memory storage for Cloudinary pipeline.
 *
 * Files are held in memory as a Buffer and piped directly to Cloudinary's
 * upload_stream. Nothing is written to disk. The 5 MB limit and MIME-type
 * whitelist prevent abuse.
 *
 * Usage:
 *   router.post('/requests', upload.single('document'), handler)
 */

'use strict';

const multer = require('multer');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, HEIC, PDF.`
        )
      );
    }
  },
});

module.exports = upload;
