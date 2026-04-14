const crypto = require('crypto');

const toBool = (value, fallback = false) => {
  if (value == null) return fallback;
  const v = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return fallback;
};

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const getSubjectKey = (req) => {
  if (req.user?.id) return `u:${req.user.id}`;
  const sessionHeader = String(req.headers['x-rec-session'] || req.headers['x-feed-session'] || '').trim();
  if (sessionHeader) return `s:${sessionHeader.slice(0, 96)}`;
  const ip = req.ip || 'na';
  const ua = String(req.headers['user-agent'] || 'na').slice(0, 80);
  return `a:${ip}:${ua}`;
};

const inCanary = (subjectKey, percent) => {
  const p = Math.max(0, Math.min(100, toInt(percent, 0)));
  if (p <= 0) return false;
  if (p >= 100) return true;
  const digest = crypto.createHash('sha256').update(`rec:${subjectKey}`).digest('hex');
  const value = parseInt(digest.slice(0, 8), 16) % 100;
  return value < p;
};

const getRecommendationFlags = (req, surface = 'slideo_feed') => {
  const killSwitch = toBool(process.env.REC_KILL_SWITCH, false);
  const recEnabled = toBool(process.env.REC_ENABLED, false);
  const shadowMode = toBool(process.env.REC_SHADOW_MODE, true);
  const adminOnly = toBool(process.env.REC_ADMIN_ONLY, false);
  const internalOnly = toBool(process.env.REC_INTERNAL_ONLY, false);
  const canaryPercent = Math.max(0, Math.min(100, toInt(process.env.REC_CANARY_PERCENT, 0)));

  const serveSlideo = toBool(process.env.REC_SERVE_SLIDEO_FEED, false);
  const serveHome = toBool(process.env.REC_SERVE_HOME_FEED, false);
  const serveExplore = toBool(process.env.REC_SERVE_EXPLORE, false);

  const subjectKey = getSubjectKey(req);
  const isAdmin = Boolean(req.user?.isAdmin);
  const isInternal = isAdmin || String(req.user?.email || '').endsWith('@slaytim.com');

  const allowedByScope =
    !adminOnly || isAdmin
      ? (!internalOnly || isInternal)
      : false;

  const canaryPass = inCanary(subjectKey, canaryPercent);
  const baseEnabled = recEnabled && !killSwitch && allowedByScope;

  const serveBySurface =
    surface === 'slideo_feed'
      ? serveSlideo
      : surface === 'home_feed'
        ? serveHome
        : surface === 'explore'
          ? serveExplore
          : false;

  const serveEnabled = baseEnabled && serveBySurface && canaryPass;
  const shadowEnabled = !killSwitch && (shadowMode || serveEnabled);

  return {
    subjectKey,
    surface,
    killSwitch,
    recEnabled,
    shadowEnabled,
    serveEnabled,
    canaryPercent,
    canaryPass,
    adminOnly,
    internalOnly,
  };
};

module.exports = {
  getRecommendationFlags,
};
