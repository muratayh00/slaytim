const { toCanonicalMediaUrl } = require('../services/storage.service');

const MEDIA_KEYS = new Set(['fileUrl', 'pdfUrl', 'thumbnailUrl', 'avatarUrl']);
const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

function normalizeMediaUrls(input) {
  if (Array.isArray(input)) return input.map(normalizeMediaUrls);
  if (input instanceof Date) return input;
  if (!input || typeof input !== 'object') return input;
  if (!isPlainObject(input)) return input;

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === 'object') {
      output[key] = normalizeMediaUrls(value);
      continue;
    }
    if (MEDIA_KEYS.has(key)) {
      output[key] = toCanonicalMediaUrl(value);
      continue;
    }
    output[key] = value;
  }
  return output;
}

module.exports = {
  normalizeMediaUrls,
};
