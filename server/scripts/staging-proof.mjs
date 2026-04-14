#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';
const samplePdf = process.env.SAMPLE_FILE || path.resolve('node_modules/pdf-parse/test/data/01-valid.pdf');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(pathname, { method = 'GET', token, json, form } = {}) {
  const headers = { 'x-staging-proof': '1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers,
    body: form || (json ? JSON.stringify(json) : undefined),
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function waitForSlideDone(slideId, token, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const r = await api(`/slides/${slideId}`, { token });
    if (!r.ok) throw new Error(`slide/${slideId} fetch failed (${r.status})`);
    const s = r.data;
    if (s.conversionStatus === 'done') {
      return s;
    }
    if (s.conversionStatus === 'failed') {
      throw new Error(`slide/${slideId} conversion failed: ${s?.conversionJob?.lastError || 'unknown'}`);
    }
    await sleep(2000);
  }
  throw new Error(`slide/${slideId} timed out waiting conversion`);
}

async function registerAndBootstrapTopic() {
  const uniq = Date.now();
  const username = `sp${String(uniq).slice(-8)}`;
  const email = `${username}@example.com`;
  const password = 'ProofPass123!';

  const reg = await api('/auth/register', { method: 'POST', json: { username, email, password } });
  if (!reg.ok || !reg.data?.token) throw new Error(`register failed ${reg.status}: ${JSON.stringify(reg.data)}`);
  const token = reg.data.token;

  const cats = await api('/categories');
  const categoryId = Array.isArray(cats.data) && cats.data[0]?.id;
  if (!categoryId) throw new Error('no category found');

  const topic = await api('/topics', {
    method: 'POST',
    token,
    json: { title: `Proof Topic ${uniq}`, description: 'staging proof', categoryId },
  });
  if (!topic.ok || !topic.data?.id) throw new Error(`topic create failed ${topic.status}: ${JSON.stringify(topic.data)}`);

  return { token, topicId: topic.data.id };
}

async function uploadSlide({ token, topicId, title }) {
  const bytes = fs.readFileSync(samplePdf);
  const form = new FormData();
  form.append('title', title);
  form.append('description', 'staging conversion proof');
  form.append('topicId', String(topicId));
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), `${title.replace(/\s+/g, '_')}.pdf`);

  const up = await api('/slides', { method: 'POST', token, form });
  if (!up.ok || !up.data?.id) throw new Error(`upload failed ${up.status}: ${JSON.stringify(up.data)}`);
  return up.data.id;
}

async function run() {
  if (!fs.existsSync(samplePdf)) {
    throw new Error(`sample file not found: ${samplePdf}`);
  }

  const report = {
    apiBase: API_BASE,
    samplePdf,
    startedAt: new Date().toISOString(),
    single: null,
    concurrent: [],
    restart: null,
    deleteCleanup: null,
  };

  const { token, topicId } = await registerAndBootstrapTopic();

  // 1) Single upload
  const oneId = await uploadSlide({ token, topicId, title: 'Proof Single Upload' });
  const oneSlide = await waitForSlideDone(oneId, token);
  const pdf = await api(`/slides/${oneId}/pdf`, { token });
  report.single = {
    slideId: oneId,
    status: oneSlide.conversionStatus,
    pdfStatus: pdf.status,
    pdfUrl: oneSlide.pdfUrl,
    thumbnailUrl: oneSlide.thumbnailUrl,
  };

  // 2) 5 concurrent uploads
  const ids = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      uploadSlide({ token, topicId, title: `Proof Concurrent ${i + 1}` }),
    ),
  );
  const doneSlides = await Promise.all(ids.map((id) => waitForSlideDone(id, token)));
  report.concurrent = doneSlides.map((s) => ({
    slideId: s.id,
    status: s.conversionStatus,
    pdfUrl: s.pdfUrl,
    thumbnailUrl: s.thumbnailUrl,
  }));

  // 3) Restart test (worker + api)
  const restartId = await uploadSlide({ token, topicId, title: 'Proof Restart Upload' });
  let restartMode = 'docker';
  try {
    execSync('docker restart server-worker-1', { stdio: 'pipe' });
    execSync('docker restart server-api-1', { stdio: 'pipe' });
    await sleep(5000);
  } catch {
    restartMode = 'local';
    const repoRoot = path.resolve(__dirname, '..', '..');
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(repoRoot, 'stop-all.ps1')}"`, { stdio: 'pipe' });
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(repoRoot, 'start-all.ps1')}"`, { stdio: 'pipe' });
    await sleep(8000);
  }
  const restartSlide = await waitForSlideDone(restartId, token, 240000);
  report.restart = {
    mode: restartMode,
    slideId: restartId,
    status: restartSlide.conversionStatus,
    pdfUrl: restartSlide.pdfUrl,
    thumbnailUrl: restartSlide.thumbnailUrl,
  };

  // 4) Delete cleanup smoke
  const delId = report.concurrent[0].slideId;
  const del = await api(`/slides/${delId}`, { method: 'DELETE', token });
  const after = await api(`/slides/${delId}`, { token });
  report.deleteCleanup = {
    deletedSlideId: delId,
    deleteStatus: del.status,
    fetchAfterDeleteStatus: after.status,
  };

  report.finishedAt = new Date().toISOString();
  const out = path.resolve('..', 'scripts', 'staging-proof-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`REPORT_WRITTEN=${out}`);
}

run().catch((err) => {
  console.error('STAGING_PROOF_FAILED', err.message);
  process.exit(1);
});
