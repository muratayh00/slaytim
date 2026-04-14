/**
 * Lightweight server-side text sanitizer.
 * Strips HTML tags and decodes common HTML entities so that raw user input
 * (bio, comments, titles, descriptions) is stored as plain text only.
 * React already escapes text on render, but storing clean data is an extra
 * safety layer against non-React consumers and future bugs.
 */

const HTML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

/**
 * Strip HTML tags, decode common HTML entities, collapse excessive whitespace.
 * @param {string|null|undefined} str
 * @param {number} [maxLen] - optional max length after sanitization
 * @returns {string}
 */
function sanitizeText(str, maxLen) {
  if (str == null) return str;
  if (typeof str !== 'string') return str;

  let out = str
    .replace(/<[^>]*>/g, '')                                // remove HTML tags
    .replace(/&[a-zA-Z#0-9]+;/g, (e) => HTML_ENTITIES[e] ?? '') // decode entities
    .replace(/[\u0000-\u001F\u007F]/g, '')                  // strip control chars
    .trim();

  if (maxLen && out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

module.exports = { sanitizeText };
