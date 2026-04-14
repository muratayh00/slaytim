const path = require('path');
const { spawn } = require('child_process');

const loadDir = path.resolve(__dirname, '../tests/load');
const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
const vus = String(process.env.VUS || '50');
const duration = String(process.env.DURATION || '60s');

const args = [
  'run',
  '--rm',
  '--network',
  'host',
  '-v',
  `${loadDir}:/scripts`,
  '-e',
  `BASE_URL=${baseUrl}`,
  '-e',
  `VUS=${vus}`,
  '-e',
  `DURATION=${duration}`,
  'grafana/k6',
  'run',
  '/scripts/k6-smoke.js',
];

const child = spawn('docker', args, { stdio: 'inherit', shell: false });
child.on('exit', (code) => process.exit(code || 0));
