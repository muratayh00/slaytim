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

function assertRemoteStorageConfigured() {
  const allowLocalDev = NODE_ENV !== 'production' && String(process.env.ALLOW_LOCAL_STORAGE_DEV || 'true') !== 'false';
  if (!['s3', 'r2'].includes(STORAGE_DRIVER)) {
    if (allowLocalDev) {
      console.warn('[storage] Remote storage disabled in development; using local uploads fallback.');
      return;
    }
    throw new Error('STORAGE_DRIVER must be "s3" or "r2". Local storage fallback is disabled.');
  }
  if (!BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    if (allowLocalDev) {
      console.warn('[storage] Remote storage credentials missing in development; using local uploads fallback.');
      return;
    }
    throw new Error('Remote storage credentials are missing (STORAGE_BUCKET/STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY).');
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

async function putLocalFile(filePath, key, contentType) {
  const c = getClient();
  if (!c) {
    if (NODE_ENV === 'production') {
      throw new Error('Remote storage is required in production');
    }
    const fallbackUrl = toUploadsUrl(filePath);
    if (fallbackUrl) return fallbackUrl;
    throw new Error('Remote storage is not configured');
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
  const signed = await getSignedUrl(
    c,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
  return signed;
}

async function putBuffer(buffer, key, contentType) {
  const c = getClient();
  if (!c) {
    if (NODE_ENV === 'production') {
      throw new Error('Remote storage is required in production');
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
  const signed = await getSignedUrl(
    c,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
  return signed;
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
  if (!/^https?:\/\//i.test(fileUrl)) return null;

  try {
    const url = new URL(fileUrl);
    const rawPath = decodeURIComponent(url.pathname || '').replace(/^\/+/, '');
    if (!rawPath) return null;
    if (rawPath.startsWith(`${BUCKET}/`)) {
      return rawPath.slice(BUCKET.length + 1);
    }
    return rawPath;
  } catch {
    return null;
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
  toUploadsUrl,
  extractStorageKeyFromUrl,
  deleteStoredObject,
};
