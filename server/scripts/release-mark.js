const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(__dirname, '../release-state');
const ACTIVE_FILE = path.join(STATE_DIR, 'active-release.json');
const HISTORY_FILE = path.join(STATE_DIR, 'release-history.json');

function nowIso() {
  return new Date().toISOString();
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function main() {
  const releaseId = String(process.argv[2] || '').trim() || `release-${Date.now()}`;
  const gitSha = String(process.env.GITHUB_SHA || process.env.RELEASE_SHA || 'local').trim();
  const actor = String(process.env.GITHUB_ACTOR || process.env.USERNAME || process.env.USER || 'unknown').trim();

  fs.mkdirSync(STATE_DIR, { recursive: true });

  const previous = safeReadJson(ACTIVE_FILE, null);
  const history = safeReadJson(HISTORY_FILE, []);

  const current = {
    releaseId,
    gitSha,
    actor,
    markedAt: nowIso(),
    previousReleaseId: previous?.releaseId || null,
  };

  history.unshift(current);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 200), null, 2));
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify(current, null, 2));

  console.log(`[release] active=${releaseId} sha=${gitSha}`);
  if (previous?.releaseId) {
    console.log(`[release] previous=${previous.releaseId}`);
  }
}

main();
