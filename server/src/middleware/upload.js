const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('../lib/pdf-parse');

// Allowed MIME types for presentations
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/pdf',
];
const GENERIC_MIME_TYPES = [
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
];
const ALLOWED_EXTENSIONS = ['.ppt', '.pptx', '.pdf'];

// Magic byte signatures - prevents MIME spoofing
const MAGIC_BYTES = {
  '.pdf': { bytes: [0x25, 0x50, 0x44, 0x46], len: 4 }, // %PDF
  '.pptx': { bytes: [0x50, 0x4B, 0x03, 0x04], len: 4 }, // PK (ZIP-based Office)
  '.ppt': { bytes: [0xD0, 0xCF, 0x11, 0xE0], len: 4 }, // OLE Compound Document
};

const UPLOAD_ERROR_STATUS = {
  UNSUPPORTED_FILE_TYPE: 415,
  UNSUPPORTED_SIGNATURE: 415,
  MAGIC_BYTE_MISMATCH: 422,
  INVALID_PDF_STRUCTURE: 422,
  FILE_TOO_LARGE: 413,
  VALIDATION_IO_ERROR: 422,
};

class UploadValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UploadValidationError';
    this.code = code;
    this.status = UPLOAD_ERROR_STATUS[code] || 400;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/slides');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '';
    cb(null, `${unique}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const genericMime = GENERIC_MIME_TYPES.includes(file.mimetype);
  const extAllowed = ALLOWED_EXTENSIONS.includes(ext);

  // Some clients send .ppt/.pptx with generic MIME; magic-byte validation still enforces real type.
  if (extAllowed && (mimeAllowed || genericMime)) {
    cb(null, true);
  } else {
    cb(
      new UploadValidationError(
        'UNSUPPORTED_FILE_TYPE',
        'Yalnizca .ppt, .pptx ve .pdf dosyalari kabul edilir.',
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * Magic byte validation middleware - runs AFTER multer saves the file.
 * Reads the first bytes from disk and compares against known signatures.
 */
async function validateMagicBytes(req, res, next) {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname).toLowerCase();
  const signature = MAGIC_BYTES[ext];

  if (!signature) {
    cleanupUploadedFile(req.file);
    return res.status(UPLOAD_ERROR_STATUS.UNSUPPORTED_SIGNATURE).json({
      code: 'UNSUPPORTED_SIGNATURE',
      error: 'Desteklenmeyen dosya turu.',
    });
  }

  let fd;
  try {
    fd = fs.openSync(req.file.path, 'r');
    const buf = Buffer.alloc(signature.len);
    fs.readSync(fd, buf, 0, signature.len, 0);
    fs.closeSync(fd);
    fd = null;

    const valid = signature.bytes.every((byte, i) => buf[i] === byte);
    if (!valid) {
      cleanupUploadedFile(req.file);
      return res.status(UPLOAD_ERROR_STATUS.MAGIC_BYTE_MISMATCH).json({
        code: 'MAGIC_BYTE_MISMATCH',
        error: 'Dosya icerigi uzantiyla uyusmuyor. Gecerli bir dosya yukleyin.',
      });
    }

    if (ext === '.pdf') {
      const raw = fs.readFileSync(req.file.path);
      try {
        const parsed = await pdfParse(raw);
        const pages = Number(parsed?.numpages || 0);
        if (!Number.isInteger(pages) || pages <= 0) {
          throw new Error('no_pages');
        }
      } catch {
        cleanupUploadedFile(req.file);
        return res.status(UPLOAD_ERROR_STATUS.INVALID_PDF_STRUCTURE).json({
          code: 'INVALID_PDF_STRUCTURE',
          error: 'PDF dosyasi bozuk veya okunamiyor. Lutfen gecerli bir PDF yukleyin.',
        });
      }
    }
  } catch (err) {
    if (fd != null) {
      try { fs.closeSync(fd); } catch {}
    }
    cleanupUploadedFile(req.file);
    return res.status(UPLOAD_ERROR_STATUS.VALIDATION_IO_ERROR).json({
      code: 'VALIDATION_IO_ERROR',
      error: 'Dosya dogrulama sirasinda hata olustu.',
    });
  }

  next();
}

function cleanupUploadedFile(file) {
  const filePath = typeof file === 'string' ? file : file?.path;
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort
  }
}

module.exports = upload;
module.exports.validateMagicBytes = validateMagicBytes;
module.exports.cleanupUploadedFile = cleanupUploadedFile;
module.exports.UploadValidationError = UploadValidationError;
module.exports.UPLOAD_ERROR_STATUS = UPLOAD_ERROR_STATUS;
module.exports._internal = { fileFilter };
