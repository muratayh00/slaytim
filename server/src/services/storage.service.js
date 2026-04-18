const fs = require('fs');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || '').toLowerCase();
const BUCKET = process.env.STORAGE_BUCKET || '';
const REGION = process.env.STORAGE_REGION || 'auto';
const ENDPOINT = process.env.STORAGE_ENDPOINT || '';
const ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || '';
const SIGNED_URL_TTL_SECONDS = Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS || 3600);

let client = null;
const NODE_ENV = process.env.NODE_ENV || 'development';

function isRemoteEnabled() {
  if (!['s3', 'r2'].includes(STORAGE_DRIVER)) return false;
  return Boolean(BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

// Whether the operator explicitly chose a remote driver (s3/r2).
// Absence of STORAGE_DRIVER (or STORAGE_DRIVER=local) means "use local disk".
function remoteDriverIntended() {
  return ['s3', 'r2'].includes(STORAGE_DRIVER);
}

function assertRemoteStorageConfigured() {
  if (!remoteDriverIntended()) {
    // Local disk mode — valid for self-hosted VPS deployments.
    console.warn('[storage] No remote storage driver configured (STORAGE_DRIVER not set or "local"); using local disk uploads.');
    return;
  }
  if (!BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    const msg = 'Remote storage credentials are missing (STORAGE_BUCKET / STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY).';
    if (NODE_ENV === 'production') throw new Error(msg);
    console.warn(`[storage] ${msg} Using local uploads fallback.`);
  }
}

function getClient() {
  if (!isRemoteEnabled()) return null;
  if (client) return client;
  client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT || undefined,
    forcePathStyle: Boolean(ENDPOINT),
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  return client;
}

async function signStorageKey(key) {
  const c = getClient();
  if (!c) return null;
  if (!key || typeof key !== 'string') return null;
  return getSignedUrl(
    c,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
}

async function putLocalFile(filePath, key, contentType) {
  const c = getClient();
  if (!c) {
    // No remote client — fall back to local disk.
    // This is valid for self-hosted VPS deployments where the filesystem is
    // persistent.  Only throw when the operator explicitly chose s3/r2 but
    // the credentials are misconfigured (remoteDriverIntended() + no client).
    if (remoteDriverIntended()) {
      throw new Error('Remote storage driver is configured but client could not be initialised — check STORAGE_BUCKET / STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY.');
    }
    const fallbackUrl = toUploadsUrl(filePath);
    if (fallbackUrl) return fallbackUrl;
    throw new Error('Could not resolve upload path for local storage.');
  }
  const body = await fs.promises.readFile(filePath);
  await c.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || undefined,
    }),
  );
  return `/uploads/${String(key).replace(/^\/+/, '')}`;
}

async function putBuffer(buffer, key, contentType) {
  const c = getClient();
  if (!c) {
    // Same guard as putLocalFile: only fail hard when the operator explicitly
    // chose s3/r2 but credentials are missing.  Self-hosted VPS with no remote
    // driver configured should always fall through to local disk.
    if (remoteDriverIntended()) {
      throw new Error('Remote storage driver is configured but client could not be initialised — check STORAGE_BUCKET / STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY.');
    }
    const sanitizedKey = String(key || '').replace(/^\/+/, '');
    const localPath = path.join(__dirname, '../../uploads', sanitizedKey);
    await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
    await fs.promises.writeFile(localPath, buffer);
    return toUploadsUrl(localPath);
  }
  await c.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || undefined,
    }),
  );
  return `/uploads/${String(key).replace(/^\/+/, '')}`;
}

function toUploadsUrl(localFilePath) {
  const normalized = localFilePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/uploads/');
  if (idx >= 0) return normalized.slice(idx);

  const rootNormalized = path.join(__dirname, '../../').replace(/\\/g, '/');
  if (normalized.startsWith(rootNormalized)) {
    const rel = normalized.slice(rootNormalized.length).replace(/^\/+/, '');
    return `/${rel}`;
  }
  return '';
}

function extractStorageKeyFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  if (fileUrl.startsWith('/uploads/')) {
    return fileUrl.replace(/^\/uploads\//, '');
  }
  if (fileUrl.startsWith('storage://')) {
    return fileUrl.replace(/^storage:\/\//, '');
  }
  if (!/^https?:\/\//i.test(fileUrl)) return null;

  try {
    const url = new URL(fileUrl);
    const rawPath = decodeURIComponent(url.pathname || '').replace(/^\/+/, '');
    if (!rawPath) return null;
    if (rawPath.startsWith(`${BUCKET}/`)) {
      return rawPath.slice(BUCKET.length + 1);
    }
    // Heuristic fallback for path-style object storage URLs when BUCKET env
    // differs from historical paths (e.g., old bucket names in persisted URLs).
    // Example:
    //   /slaytim-uploads/thumbnails/source-1.png  -> thumbnails/source-1.png
    const parts = rawPath.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0].toLowerCase();
      const second = parts[1].toLowerCase();
      const likelyBucketPrefix = first.includes('upload') || first.includes('bucket');
      const knownMediaRoot = ['thumbnails', 'pdfs', 'slides', 'avatars', 'originals'].includes(second);
      if (likelyBucketPrefix && knownMediaRoot) {
        return parts.slice(1).join('/');
      }
    }
    return rawPath;
  } catch {
    return null;
  }
}

function toCanonicalMediaUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return fileUrl;
  if (fileUrl.startsWith('/uploads/')) return fileUrl;
  const key = extractStorageKeyFromUrl(fileUrl);
  if (!key) return fileUrl;
  return `/uploads/${key.replace(/^\/+/, '')}`;
}

async function resolveStorageReadUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return fileUrl;
  if (fileUrl.startsWith('/uploads/')) {
    if (!isRemoteEnabled()) return fileUrl;
    const key = extractStorageKeyFromUrl(fileUrl);
    if (!key) return fileUrl;
    try {
      const signed = await signStorageKey(key);
      return signed || fileUrl;
    } catch {
      return fileUrl;
    }
  }
  if (!/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (!isRemoteEnabled()) return fileUrl;

  const key = extractStorageKeyFromUrl(fileUrl);
  if (!key) return fileUrl;

  try {
    const signed = await signStorageKey(key);
    return signed || fileUrl;
  } catch {
    return fileUrl;
  }
}

async function deleteStoredObject(fileUrl) {
  if (!fileUrl) return { deleted: false, reason: 'empty' };

  // Local path cleanup for development/local mode.
  if (fileUrl.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '../../', fileUrl.replace(/^\/+/, ''));
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      return { deleted: true, driver: 'local' };
    } catch (err) {
      return { deleted: false, driver: 'local', reason: err?.message || String(err) };
    }
  }

  const c = getClient();
  if (!c) {
    if (NODE_ENV === 'production') {
      throw new Error('Remote storage is required in production');
    }
    return { deleted: false, reason: 'remote_not_configured' };
  }

  const key = extractStorageKeyFromUrl(fileUrl);
  if (!key) return { deleted: false, reason: 'invalid_key' };

  await c.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
  return { deleted: true, driver: STORAGE_DRIVER, key };
}

module.exports = {
  isRemoteEnabled,
  assertRemoteStorageConfigured,
  putLocalFile,
  putBuffer,
  resolveStorageReadUrl,
  toCanonicalMediaUrl,
  toUploadsUrl,
  extractStorageKeyFromUrl,
  deleteStoredObject,
};
