#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const root = path.basename(cwd).toLowerCase() === 'client' ? path.dirname(cwd) : cwd;
const clientDir = path.join(root, 'client');
const clientSrcDir = path.join(clientDir, 'src');

const bannedPatterns = [
  { regex: /@supabase\/supabase-js/g, reason: 'Supabase JS client is not allowed in frontend.' },
  { regex: /process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, reason: 'Public Supabase URL env access is forbidden in frontend code.' },
  { regex: /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, reason: 'Public Supabase anon key env access is forbidden in frontend code.' },
  { regex: /supabase\.co\/rest\/v1/gi, reason: 'Supabase Data API REST endpoint usage is forbidden in frontend.' },
  { regex: /supabase\.co\/auth\/v1/gi, reason: 'Supabase Auth API direct usage is forbidden in frontend.' },
  { regex: /supabase\.co\/storage\/v1/gi, reason: 'Supabase Storage API direct usage is forbidden in frontend.' },
];

const targetFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
      walk(fullPath);
      continue;
    }
    targetFiles.push(fullPath);
  }
}

if (!fs.existsSync(clientDir)) {
  console.error('[guard-no-supabase-client] client directory not found.');
  process.exit(1);
}

if (fs.existsSync(clientSrcDir)) walk(clientSrcDir);

for (const envName of ['.env.local', '.env.example', '.env.staging.example']) {
  const envPath = path.join(clientDir, envName);
  if (fs.existsSync(envPath)) targetFiles.push(envPath);
}

const violations = [];

for (const file of targetFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const isEnvFile = file.endsWith('.env.local') || file.endsWith('.env.example') || file.endsWith('.env.staging.example');

  if (isEnvFile) {
    if (/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=/m.test(content)) {
      violations.push({
        file,
        rule: 'NEXT_PUBLIC_SUPABASE_URL assignment is forbidden.',
        count: 1,
      });
    }
    if (/^\s*NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=/m.test(content)) {
      violations.push({
        file,
        rule: 'NEXT_PUBLIC_SUPABASE_ANON_KEY assignment is forbidden.',
        count: 1,
      });
    }
  }

  for (const rule of bannedPatterns) {
    const matches = content.match(rule.regex);
    if (matches && matches.length > 0) {
      violations.push({
        file,
        rule: rule.reason,
        count: matches.length,
      });
    }
  }
}

if (violations.length > 0) {
  console.error('\n[SECURITY] Supabase frontend policy violation(s) found:\n');
  for (const v of violations) {
    console.error(`- ${v.file} (${v.count}) -> ${v.rule}`);
  }
  console.error('\nPolicy: DB access must be backend-only. Remove Supabase client/Data API usage from frontend.\n');
  process.exit(1);
}

console.log('[guard-no-supabase-client] OK - frontend contains no Supabase Data API/client usage.');
