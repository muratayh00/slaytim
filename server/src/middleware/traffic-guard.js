const BOT_UA_REGEX =
  /(bot|crawl|spider|crawler|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|headless|phantom|lighthouse|pagespeed)/i;

function isLikelyBot(req) {
  const ua = String(req.headers['user-agent'] || '').trim();
  if (!ua) return false;
  return BOT_UA_REGEX.test(ua);
}

function skipBotMetrics(req, res, next) {
  if (!isLikelyBot(req)) return next();
  return res.status(204).end();
}

function normalizeIp(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/, '');
}

function parseBlockedIpSet() {
  const raw = String(process.env.BLOCKED_IPS || '')
    .split(',')
    .map((s) => normalizeIp(s))
    .filter(Boolean);
  return new Set(raw);
}

function denyBlockedIps(req, res, next) {
  const blocked = parseBlockedIpSet();
  if (blocked.size === 0) return next();

  const candidateIps = [
    normalizeIp(req.ip),
    normalizeIp(req.headers['x-forwarded-for']),
    normalizeIp(req.socket?.remoteAddress),
  ].filter(Boolean);

  if (candidateIps.some((ip) => blocked.has(ip))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  return next();
}

module.exports = {
  isLikelyBot,
  skipBotMetrics,
  denyBlockedIps,
};

