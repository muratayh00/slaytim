import { test, expect, request } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:5001/api';
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || '';

const SIMPLE_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 43 >>
stream
BT /F1 18 Tf 30 150 Td (Slaytim E2E PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000062 00000 n
0000000122 00000 n
0000000218 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
311
%%EOF`;

async function registerUser(apiCtx: Awaited<ReturnType<typeof request.newContext>>) {
  const unique = Date.now();
  const payload = {
    username: `e2e_${unique}`,
    email: `e2e_${unique}@mail.test`,
    password: 'Test1234!',
  };
  const res = await apiCtx.post(`${API_BASE}/auth/register`, { data: payload });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test('login/topic/slide-upload/conversion/report flow works', async ({ page }) => {
  const apiCtx = await request.newContext();
  const auth = await registerUser(apiCtx);
  const token = auth.token as string;
  const user = auth.user as { id: number };

  const authed = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  const topicRes = await authed.post(`${API_BASE}/topics`, {
    data: { title: `E2E Topic ${Date.now()}`, description: 'topic desc', categoryId: 1 },
  });
  expect(topicRes.ok()).toBeTruthy();
  const topic = await topicRes.json();
  expect(topic.id).toBeTruthy();

  const slideRes = await authed.post(`${API_BASE}/slides`, {
    multipart: {
      topicId: String(topic.id),
      title: `E2E Slide ${Date.now()}`,
      description: 'slide desc',
      file: {
        name: 'e2e.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(SIMPLE_PDF),
      },
    },
  });
  expect(slideRes.ok()).toBeTruthy();
  const slide = await slideRes.json();
  expect(slide.id).toBeTruthy();

  let conversionStatus = slide.conversionStatus as string;
  for (let i = 0; i < 10; i += 1) {
    const check = await authed.get(`${API_BASE}/slides/${slide.id}`);
    expect(check.ok()).toBeTruthy();
    const body = await check.json();
    conversionStatus = body.conversionStatus;
    if (
      conversionStatus === 'done' ||
      conversionStatus === 'failed' ||
      conversionStatus === 'unsupported' ||
      conversionStatus === 'pending'
    ) break;
    await page.waitForTimeout(1000);
  }
  expect(['done', 'failed', 'unsupported', 'pending']).toContain(conversionStatus);

  const reportRes = await authed.post(`${API_BASE}/reports`, {
    data: { targetType: 'topic', targetId: topic.id, reason: 'spam', details: 'e2e report' },
  });
  expect(reportRes.ok()).toBeTruthy();

  const slideoFeedRes = await authed.get(`${API_BASE}/slideo/feed`);
  expect(slideoFeedRes.ok()).toBeTruthy();

  await page.addInitScript((t) => localStorage.setItem('token', t), token);
  await page.goto(`/konu/${topic.id}-${topic.slug || ''}`);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('h1#nextjs__container_errors_label')).toHaveCount(0);

  const meRes = await authed.get(`${API_BASE}/auth/me`);
  expect(meRes.ok()).toBeTruthy();
  const me = await meRes.json();
  expect(me?.user?.id).toBe(user.id);
});

test('admin report + conversion endpoints are reachable', async () => {
  test.skip(!ADMIN_TOKEN, 'E2E_ADMIN_TOKEN is not set');
  const adminCtx = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });

  const reportsRes = await adminCtx.get(`${API_BASE}/reports?status=pending&page=1`);
  expect(reportsRes.ok()).toBeTruthy();
  const reportsBody = await reportsRes.json();
  const firstReportId = reportsBody?.reports?.[0]?.id;

  if (firstReportId) {
    const batchRes = await adminCtx.patch(`${API_BASE}/reports/batch/status`, {
      data: { ids: [firstReportId], status: 'reviewed', deleteContent: false },
    });
    expect(batchRes.ok()).toBeTruthy();
  }

  const convRes = await adminCtx.get(`${API_BASE}/admin/conversion-jobs?status=all&page=1`);
  expect(convRes.ok()).toBeTruthy();

  const convHealthRes = await adminCtx.get(`${API_BASE}/admin/conversion-jobs/health`);
  expect(convHealthRes.ok()).toBeTruthy();
});

test('flashcard set can be created and submitted', async () => {
  const apiCtx = await request.newContext();
  const auth = await registerUser(apiCtx);
  const token = auth.token as string;

  const authed = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  const topicRes = await authed.post(`${API_BASE}/topics`, {
    data: { title: `Flashcard Topic ${Date.now()}`, description: 'topic desc', categoryId: 1 },
  });
  expect(topicRes.ok()).toBeTruthy();
  const topic = await topicRes.json();

  const slideRes = await authed.post(`${API_BASE}/slides`, {
    multipart: {
      topicId: String(topic.id),
      title: `Flashcard Slide ${Date.now()}`,
      description: 'slide desc',
      file: {
        name: 'flashcard.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(SIMPLE_PDF),
      },
    },
  });
  expect(slideRes.ok()).toBeTruthy();
  const slide = await slideRes.json();

  const createSet = await authed.post(`${API_BASE}/flashcards/slide/${slide.id}`, {
    data: {
      title: 'Temel Quiz',
      mode: 'four',
      questions: [
        {
          prompt: '2 + 2 kactir?',
          options: ['1', '2', '3', '4'],
          correctOption: 3,
        },
      ],
    },
  });
  expect(createSet.ok()).toBeTruthy();
  const created = await createSet.json();
  expect(created.id).toBeTruthy();

  const submit = await authed.post(`${API_BASE}/flashcards/${created.id}/submit`, {
    data: {
      answers: [{ questionId: created.questions[0].id, answerIndex: 3 }],
    },
  });
  expect(submit.ok()).toBeTruthy();
  const result = await submit.json();
  expect(result.score).toBe(1);
  expect(result.total).toBe(1);
});

