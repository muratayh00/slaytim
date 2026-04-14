const { parseIdSlug } = require('../lib/slug');

const validateNumericParam = (paramName) => (req, res, next) => {
  const raw = String(req.params?.[paramName] || '').trim();
  const parsed = parseIdSlug(raw);
  const numericId = parsed?.id || (/^\d+$/.test(raw) ? Number(raw) : null);

  if (!numericId || !Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }

  req.params[paramName] = String(numericId);
  if (parsed?.slug) req.params[`${paramName}Slug`] = parsed.slug;
  return next();
};

const parseIdSlugParam = (paramName, targetName = 'id') => (req, res, next) => {
  const raw = String(req.params?.[paramName] || '').trim();
  const parsed = parseIdSlug(raw);
  if (!parsed.id) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }
  req.params[targetName] = String(parsed.id);
  req.params[`${paramName}Slug`] = parsed.slug;
  return next();
};

module.exports = {
  validateNumericParam,
  parseIdSlugParam,
};
