const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('../lib/pdf-parse');
const logger = require('../lib/logger');

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

// ── Shared log helper ─────────────────────────────────────────────────────────
// All upload-middleware log lines share this structure so grep/filter is easy:
//   pm2 logs slaytim-api | grep '\[upload-mw\]'
function mwLog(level, stage, req, file, extra = {}) {
  const f = file || req?.file;
  logger[level](`[upload-mw] ${stage}`, {
    requestId: req?._uploadRequestId,
    originalname: f?.originalname,
    size: f?.size,
    mimetype: f?.mimetype,
    path: f?.path,
    elapsedMs: req?._uploadMwStart ? Date.now() - req._uploadMwStart : undefined,
    ...extra,
  });
}

// ── diskStorage with timing ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Stamp the request the first time multer touches it.
    if (!req._uploadMwStart) {
      req._uploadMwStart = Date.now();
      req._uploadRequestId = `ul-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    mwLog('info', 'multer destination start', req, file);

    const dir = path.join(__dirname, '../../uploads/slides');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    mwLog('info', 'multer destination resolved', req, file, { dir });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '';
    const name = `${unique}${safeExt}`;

    mwLog('info', 'multer filename generated', req, file, { generatedName: name });
    cb(null, name);
  },
});

// ── fileFilter with logging ───────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const genericMime = GENERIC_MIME_TYPES.includes(file.mimetype);
  const extAllowed = ALLOWED_EXTENSIONS.includes(ext);

  mwLog('info', 'fileFilter check', req, file, { ext, mimeAllowed, genericMime, extAllowed });

  // Some clients send .ppt/.pptx with generic MIME; magic-byte validation still enforces real type.
  if (extAllowed && (mimeAllowed || genericMime)) {
    mwLog('info', 'fileFilter accepted', req, file);
    cb(null, true);
  } else {
    mwLog('warn', 'fileFilter rejected', req, file, { reason: 'UNSUPPORTED_FILE_TYPE' });
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

  // Ensure timing baseline exists even if fileFilter ran before storage stamped req
  if (!req._uploadMwStart) req._uploadMwStart = Date.now();
  if (!req._uploadRequestId) {
    req._uploadRequestId = `ul-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  mwLog('info', 'validateMagicBytes start', req, req.file);

  const ext = path.extname(req.file.originalname).toLowerCase();
  const signature = MAGIC_BYTES[ext];

  if (!signature) {
    mwLog('warn', 'validateMagicBytes unsupported extension', req, req.file, { ext });
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
      mwLog('warn', 'validateMagicBytes magic byte mismatch', req, req.file, { ext });
      cleanupUploadedFile(req.file);
      return res.status(UPLOAD_ERROR_STATUS.MAGIC_BYTE_MISMATCH).json({
        code: 'MAGIC_BYTE_MISMATCH',
        error: 'Dosya icerigi uzantiyla uyusmuyor. Gecerli bir dosya yukleyin.',
      });
    }

    mwLog('info', 'validateMagicBytes magic bytes ok', req, req.file, { ext });

    if (ext === '.pdf') {
      mwLog('info', 'validateMagicBytes pdf parse start', req, req.file, {
        fileSizeBytes: req.file.size,
      });
      const pdfParseStart = Date.now();

      const raw = await fs.promises.readFile(req.file.path); // async — avoids blocking the event loop
      try {
        const parsed = await Promise.race([
          pdfParse(raw),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('pdf_parse_timeout')), 10_000)
          ),
        ]);
        const pages = Number(parsed?.numpages || 0);
        mwLog('info', 'validateMagicBytes pdf parse finish', req, req.file, {
          pages,
          parseDurationMs: Date.now() - pdfParseStart,
        });
        if (!Number.isInteger(pages) || pages <= 0) {
          throw new Error('no_pages');
        }
      } catch (pdfErr) {
        mwLog('warn', 'validateMagicBytes pdf parse failed', req, req.file, {
          reason: pdfErr?.message,
          parseDurationMs: Date.now() - pdfParseStart,
        });
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
    mwLog('error', 'validateMagicBytes io error', req, req.file, { error: err?.message });
    cleanupUploadedFile(req.file);
    return res.status(UPLOAD_ERROR_STATUS.VALIDATION_IO_ERROR).json({
      code: 'VALIDATION_IO_ERROR',
      error: 'Dosya dogrulama sirasinda hata olustu.',
    });
  }

  mwLog('info', 'validateMagicBytes next called', req, req.file);
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
