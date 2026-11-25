const multer = require('multer');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_TEXT_TYPES = ['text/plain', 'application/pdf'];
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB per file

// Images are kept in memory just long enough to be Base64-encoded into the
// MongoDB document (see toDataUri below) — not written to local disk. Render
// (and most hosts) give the app an ephemeral filesystem, so anything saved
// to disk disappears on the next deploy/restart; storing the image data in
// MongoDB itself means it persists the same way the rest of the app's data does.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const isImageField = file.fieldname === 'coverPhoto' || file.fieldname === 'profilePicture';
    const isTextField = file.fieldname === 'textFile';
    if (isImageField && !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(Object.assign(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'), { code: 'INVALID_FILE_TYPE' }));
    }
    if (isTextField && !ALLOWED_TEXT_TYPES.includes(file.mimetype)) {
      return cb(Object.assign(new Error('Only .txt or .pdf files are allowed.'), { code: 'INVALID_FILE_TYPE' }));
    }
    cb(null, true);
  }
});

// Converts an in-memory uploaded file into a self-contained data: URI so it
// can be stored directly on the Mongo document.
const toDataUri = (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

module.exports = { upload, toDataUri, MAX_UPLOAD_BYTES };
