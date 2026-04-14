import { test, expect, request } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:5001/api';
const csrfTokens = new WeakMap<any, string>();

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
BT /F1 18 Tf 30 150 Td (Slaytim Social E2E) Tj ET
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

type AuthPayload = {
  token: string;
  user: { id: number; username: string; email: string };
};

async function registerUser(apiCtx: Awaited<ReturnType<typeof request.newContext>>, prefix: string): Promise<AuthPayload> {
  const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 10) || 'user';
  const username = `${safePrefix}_${unique}`.slice(0, 20);
  const payload = {
    username,
    email: `${prefix}_${unique}@mail.test`,
    password: 'Test1234!',
  };
  const res = await apiPost(apiCtx, `${API_BASE}/auth/register`, { data: payload });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function authedContext(token: string) {
  const ctx = await request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  await ensureCsrfToken(ctx);
  return ctx;
}

async function ensureCsrfToken(ctx: Awaited<ReturnType<typeof request.newContext>>) {
  const existing = csrfTokens.get(ctx);
  if (existing) return existing;
  const res = await ctx.get(`${API_BASE}/auth/csrf`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const token = String(body?.csrfToken || '');
  expect(token.length).toBeGreaterThan(10);
  csrfTokens.set(ctx, token);
  return token;
}

async function apiPost(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  url: string,
  options: Parameters<typeof ctx.post>[1] = {},
) {
  const token = await ensureCsrfToken(ctx);
  return ctx.post(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      'x-csrf-token': token,
    },
  });
}

async function apiPatch(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  url: string,
  options: Parameters<typeof ctx.patch>[1] = {},
) {
  const token = await ensureCsrfToken(ctx);
  return ctx.patch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      'x-csrf-token': token,
    },
  });
}

async function getFirstCategoryId(ctx: Awaited<ReturnType<typeof request.newContext>>) {
  const res = await ctx.get(`${API_BASE}/categories`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  expect(body.length).toBeGreaterThan(0);
  return Number(body[0].id);
}

async function createTopicAndSlide(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  categoryId: number,
  label: string,
) {
  const topicRes = await apiPost(ctx, `${API_BASE}/topics`, {
    data: { title: `SOC ${label} Topic ${Date.now()}`, description: 'social flow', categoryId },
  });
  expect(topicRes.ok()).toBeTruthy();
  const topic = await topicRes.json();

  const slideRes = await apiPost(ctx, `${API_BASE}/slides`, {
    multipart: {
      topicId: String(topic.id),
      title: `SOC ${label} Slide ${Date.now()}`,
      description: 'social flow slide',
      file: {
        name: `${label}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from(SIMPLE_PDF),
      },
    },
  });
  expect(slideRes.ok()).toBeTruthy();
  const slide = await slideRes.json();
  return { topic, slide };
}

async function waitForNotificationCount(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  minCount: number,
  timeoutMs = 5000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await ctx.get(`${API_BASE}/notifications/unread-count`);
    if (res.ok()) {
      const body = await res.json();
      if (Number(body?.count || 0) >= minCount) return Number(body.count);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Unread count did not reach ${minCount} within ${timeoutMs}ms`);
}

test('social core: user follow + slide like/save produce notifications and stable toggles', async () => {
  const anon = await request.newContext();
  const authorAuth = await registerUser(anon, 'soc_author');
  const actorAuth = await registerUser(anon, 'soc_actor');

  const author = await authedContext(authorAuth.token);
  const actor = await authedContext(actorAuth.token);

  const categoryId = await getFirstCategoryId(author);
  const { slide } = await createTopicAndSlide(author, categoryId, 'follow_like_save');

  const followRes = await apiPost(actor, `${API_BASE}/follows/user/${authorAuth.user.id}`);
  expect(followRes.ok()).toBeTruthy();
  expect((await followRes.json()).following).toBe(true);

  const likeRes = await apiPost(actor, `${API_BASE}/likes/slide/${slide.id}`);
  expect(likeRes.ok()).toBeTruthy();
  expect((await likeRes.json()).liked).toBe(true);

  const saveRes = await apiPost(actor, `${API_BASE}/saves/slide/${slide.id}`);
  expect(saveRes.ok()).toBeTruthy();
  expect((await saveRes.json()).saved).toBe(true);

  const unread = await waitForNotificationCount(author, 3);
  expect(unread).toBeGreaterThanOrEqual(3);

  const allNotifsRes = await author.get(`${API_BASE}/notifications`);
  expect(allNotifsRes.ok()).toBeTruthy();
  const notifications = await allNotifsRes.json();
  const types = new Set((notifications || []).map((n: any) => n.type));
  expect(types.has('follow')).toBeTruthy();
  expect(types.has('like')).toBeTruthy();
  expect(types.has('save')).toBeTruthy();

  // Idempotent toggle checks
  const unlikeRes = await apiPost(actor, `${API_BASE}/likes/slide/${slide.id}`);
  expect(unlikeRes.ok()).toBeTruthy();
  expect((await unlikeRes.json()).liked).toBe(false);

  const unsaveRes = await apiPost(actor, `${API_BASE}/saves/slide/${slide.id}`);
  expect(unsaveRes.ok()).toBeTruthy();
  expect((await unsaveRes.json()).saved).toBe(false);

  const unfollowRes = await apiPost(actor, `${API_BASE}/follows/user/${authorAuth.user.id}`);
  expect(unfollowRes.ok()).toBeTruthy();
  expect((await unfollowRes.json()).following).toBe(false);

  const markAllRes = await apiPatch(author, `${API_BASE}/notifications/all/read`);
  expect(markAllRes.ok()).toBeTruthy();
  const unreadAfterRes = await author.get(`${API_BASE}/notifications/unread-count`);
  expect(unreadAfterRes.ok()).toBeTruthy();
  expect((await unreadAfterRes.json()).count).toBe(0);
});

test('collections flow: create, add/remove slide, follow/unfollow from another user', async () => {
  const anon = await request.newContext();
  const ownerAuth = await registerUser(anon, 'soc_col_owner');
  const followerAuth = await registerUser(anon, 'soc_col_follower');

  const owner = await authedContext(ownerAuth.token);
  const follower = await authedContext(followerAuth.token);

  const categoryId = await getFirstCategoryId(owner);
  const { slide } = await createTopicAndSlide(owner, categoryId, 'collection');

  const createRes = await apiPost(owner, `${API_BASE}/collections`, {
    data: { name: `SOC Collection ${Date.now()}`, description: 'social collection', isPublic: true },
  });
  expect(createRes.ok()).toBeTruthy();
  const collection = await createRes.json();
  expect(collection.id).toBeTruthy();

  const addRes = await apiPost(owner, `${API_BASE}/collections/${collection.id}/slides/${slide.id}`);
  expect(addRes.ok()).toBeTruthy();
  expect((await addRes.json()).added).toBe(true);

  const removeRes = await apiPost(owner, `${API_BASE}/collections/${collection.id}/slides/${slide.id}`);
  expect(removeRes.ok()).toBeTruthy();
  expect((await removeRes.json()).added).toBe(false);

  const reAddRes = await apiPost(owner, `${API_BASE}/collections/${collection.id}/slides/${slide.id}`);
  expect(reAddRes.ok()).toBeTruthy();
  expect((await reAddRes.json()).added).toBe(true);

  const followRes = await apiPost(follower, `${API_BASE}/collections/${collection.id}/follow`);
  expect(followRes.ok()).toBeTruthy();
  expect((await followRes.json()).following).toBe(true);

  const mineFollowedRes = await follower.get(`${API_BASE}/collections/following/me`);
  expect(mineFollowedRes.ok()).toBeTruthy();
  const followedBody = await mineFollowedRes.json();
  const followedIds = new Set((followedBody.collections || []).map((c: any) => c.id));
  expect(followedIds.has(collection.id)).toBeTruthy();

  const unfollowRes = await apiPost(follower, `${API_BASE}/collections/${collection.id}/follow`);
  expect(unfollowRes.ok()).toBeTruthy();
  expect((await unfollowRes.json()).following).toBe(false);
});

test('rooms reliability: public follow/unfollow and private password-protected access by room name', async () => {
  const anon = await request.newContext();
  const ownerAuth = await registerUser(anon, 'soc_room_owner');
  const memberAuth = await registerUser(anon, 'soc_room_member');

  const owner = await authedContext(ownerAuth.token);
  const member = await authedContext(memberAuth.token);

  const publicName = `SOC Public Room ${Date.now()}`;
  const publicRoomRes = await apiPost(owner, `${API_BASE}/rooms`, {
    data: { name: publicName, description: 'public room', isPublic: true },
  });
  expect(publicRoomRes.ok()).toBeTruthy();
  const publicRoom = await publicRoomRes.json();

  const publicListRes = await anon.get(`${API_BASE}/rooms`);
  expect(publicListRes.ok()).toBeTruthy();
  const publicList = await publicListRes.json();
  const publicIds = new Set((publicList.rooms || []).map((r: any) => r.id));
  expect(publicIds.has(publicRoom.id)).toBeTruthy();

  const followPublicRes = await apiPost(member, `${API_BASE}/rooms/${publicRoom.id}/follow`);
  expect(followPublicRes.ok()).toBeTruthy();
  expect((await followPublicRes.json()).joined).toBe(true);

  const myRoomsAfterFollowRes = await member.get(`${API_BASE}/rooms/me`);
  expect(myRoomsAfterFollowRes.ok()).toBeTruthy();
  const myRoomsAfterFollow = await myRoomsAfterFollowRes.json();
  const myFollowIds = new Set((myRoomsAfterFollow.rooms || []).map((r: any) => r.id));
  expect(myFollowIds.has(publicRoom.id)).toBeTruthy();

  const unfollowPublicRes = await apiPost(member, `${API_BASE}/rooms/${publicRoom.id}/unfollow`);
  expect(unfollowPublicRes.ok()).toBeTruthy();
  expect((await unfollowPublicRes.json()).joined).toBe(false);

  const privateName = `SOC Private Room ${Date.now()}`;
  const privatePassword = 'roompass123';
  const privateRoomRes = await apiPost(owner, `${API_BASE}/rooms`, {
    data: { name: privateName, description: 'private room', isPublic: false, accessPassword: privatePassword },
  });
  expect(privateRoomRes.ok()).toBeTruthy();
  const privateRoom = await privateRoomRes.json();

  // Private room must not appear in public listing
  const publicList2Res = await anon.get(`${API_BASE}/rooms`);
  expect(publicList2Res.ok()).toBeTruthy();
  const publicList2 = await publicList2Res.json();
  const publicIds2 = new Set((publicList2.rooms || []).map((r: any) => r.id));
  expect(publicIds2.has(privateRoom.id)).toBe(false);

  const wrongAccessRes = await apiPost(member, `${API_BASE}/rooms/access`, {
    data: { name: privateName, password: 'wrong-pass' },
  });
  expect(wrongAccessRes.status()).toBe(403);

  const correctAccessRes = await apiPost(member, `${API_BASE}/rooms/access`, {
    data: { name: privateName, password: privatePassword },
  });
  expect(correctAccessRes.ok()).toBeTruthy();
  const accessBody = await correctAccessRes.json();
  expect(accessBody.joined).toBe(true);
  expect(accessBody.roomId).toBe(privateRoom.id);

  const privateDetailRes = await member.get(`${API_BASE}/rooms/${privateRoom.id}`);
  expect(privateDetailRes.ok()).toBeTruthy();
  const privateDetail = await privateDetailRes.json();
  expect(Array.isArray(privateDetail.members)).toBeTruthy();
});
