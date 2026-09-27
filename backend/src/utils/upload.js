const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const httpError = require('./httpError');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const LICENSE_DIR = path.join(UPLOAD_ROOT, 'licenses');
const QR_DIR = path.join(UPLOAD_ROOT, 'qr');
for (const dir of [LICENSE_DIR, QR_DIR]) fs.mkdirSync(dir, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, file.fieldname === 'qrCode' ? QR_DIR : LICENSE_DIR);
  },
  filename(_req, file, cb) {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  }
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(httpError(400, 'Only JPG, PNG, WebP or PDF files are allowed.'));
  }
  cb(null, true);
}

const businessUploads = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).fields([
  { name: 'licenseDocument', maxCount: 1 },
  { name: 'qrCode', maxCount: 1 }
]);

// Wrap so multer errors (file too large, bad type) become normal JSON error responses.
function handleBusinessUploads(req, res, next) {
  businessUploads(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return next(httpError(400, 'Files must be 5 MB or smaller.'));
    return next(error.status ? error : httpError(400, error.message || 'File upload failed.'));
  });
}

module.exports = { handleBusinessUploads, LICENSE_DIR, QR_DIR, UPLOAD_ROOT };
