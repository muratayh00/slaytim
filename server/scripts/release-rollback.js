const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(__dirname, '../release-state');
const ACTIVE_FILE = path.join(STATE_DIR, 'active-release.json');
const HISTORY_FILE = path.join(STATE_DIR, 'release-history.json');

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function main() {
  const history = safeReadJson(HISTORY_FILE, []);
  if (!Array.isArray(history) || history.length < 2) {
    console.error('[rollback] Not enough release history to rollback.');
    process.exit(1);
  }

  const current = history[0];
  const previous = history[1];

  fs.writeFileSync(ACTIVE_FILE, JSON.stringify(previous, null, 2));
  history.shift();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  console.log(`[rollback] from=${current.releaseId} to=${previous.releaseId}`);
  console.log(`[rollback] target sha=${previous.gitSha}`);
}

main();
