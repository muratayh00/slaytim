const fs = require('fs');
const { execFile } = require('child_process');
const logger = require('../lib/logger');

function getClamScanBinary() {
  const envPath = String(process.env.CLAMSCAN_PATH || '').trim();
  if (envPath && fs.existsSync(envPath)) return envPath;

  const known = process.platform === 'win32'
    ? [
        'C:\\Program Files\\ClamAV\\clamscan.exe',
        'C:\\Program Files\\ClamAV\\clamdscan.exe',
      ]
    : ['/usr/bin/clamscan', '/usr/local/bin/clamscan', '/usr/bin/clamdscan'];

  const found = known.find((p) => fs.existsSync(p));
  return found || null;
}

function isScanRequired() {
  return String(process.env.CLAMAV_REQUIRED || '').toLowerCase() === 'true';
}

function hasClamAv() {
  return Boolean(getClamScanBinary());
}

function runScan(binary, filePath) {
  const args = binary.toLowerCase().includes('clamdscan')
    ? ['--no-summary', filePath]
    : ['--no-summary', '--infected', filePath];
  return new Promise((resolve, reject) => {
    execFile(binary, args, { windowsHide: true, timeout: 90_000 }, (err, stdout, stderr) => {
      if (!err) {
        resolve({ clean: true, output: String(stdout || '').trim() });
        return;
      }
      // clamscan exit code 1 == infected file
      if (Number(err.code) === 1) {
        resolve({
          clean: false,
          output: String(stdout || stderr || 'infected file detected').trim(),
        });
        return;
      }
      reject(new Error(String(stderr || stdout || err.message || 'scan failed').trim()));
    });
  });
}

async function scanFile(filePath) {
  const binary = getClamScanBinary();
  if (!binary) {
    if (isScanRequired()) {
      throw new Error('File scan is required but ClamAV is not available');
    }
    return { clean: true, skipped: true, engine: null };
  }
  const result = await runScan(binary, filePath);
  return {
    ...result,
    skipped: false,
    engine: binary,
  };
}

/**
 * Startup check for ClamAV.
 * If CLAMAV_REQUIRED=true and ClamAV is not found → log fatal and exit.
 * If CLAMAV_REQUIRED=false and ClamAV is not found → log warning only.
 */
function assertClamAvStartup() {
  const required = isScanRequired();
  const available = hasClamAv();
  const binary = getClamScanBinary();

  if (available) {
    logger.info(`[clamav] ClamAV found at: ${binary}`);
    return;
  }

  if (required) {
    logger.error('[clamav] FATAL: CLAMAV_REQUIRED=true but ClamAV binary not found.');
    logger.error('[clamav] Install ClamAV or set CLAMAV_REQUIRED=false to disable.');
    const paths = process.platform === 'win32'
      ? ['C:\\Program Files\\ClamAV\\clamscan.exe', 'C:\\Program Files\\ClamAV\\clamdscan.exe']
      : ['/usr/bin/clamscan', '/usr/local/bin/clamscan', '/usr/bin/clamdscan'];
    logger.error('[clamav] Searched paths: ' + paths.join(', '));
    process.exit(1);
  } else {
    logger.warn('[clamav] ClamAV not found. File scanning disabled. Set CLAMAV_REQUIRED=true to enforce.');
  }
}

module.exports = {
  scanFile,
  hasClamAv,
  getClamScanBinary,
  isScanRequired,
  assertClamAvStartup,
};

