/**
 * Unit tests for users.controller.js
 *
 * Run with: npx jest src/__tests__/users.controller.test.js
 */

jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  topic: { findMany: jest.fn(), groupBy: jest.fn() },
  slide: { aggregate: jest.fn() },
  slideo: { findMany: jest.fn(), aggregate: jest.fn() },
  slideLike: { findMany: jest.fn() },
  topicLike: { findMany: jest.fn() },
  savedSlide: { findMany: jest.fn() },
  followedCategory: { findMany: jest.fn() },
  followedUser: { findMany: jest.fn() },
  visitedTopic: { findMany: jest.fn() },
}));

const prisma = require('../lib/prisma');
const { getProfile, updateProfile, getUserTopics } = require('../controllers/users.controller');

function mockReqRes(params = {}, body = {}, user = null) {
  const req = { params, body, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ── getProfile ────────────────────────────────────────────────────────────────
describe('getProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { req, res } = mockReqRes({ username: 'ghost' });
    await getProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns profile data when user exists', async () => {
    const mockProfile = {
      id: 1, username: 'alice', avatarUrl: null, bio: 'Hello', createdAt: new Date(),
      _count: { topics: 3, slides: 5, following: 2, followers: 10 },
    };
    prisma.user.findUnique.mockResolvedValue(mockProfile);
    prisma.slide.aggregate.mockResolvedValue({ _sum: { viewsCount: 0, savesCount: 0, likesCount: 0 } });
    prisma.topic.groupBy.mockResolvedValue([]);
    prisma.slideo.aggregate.mockResolvedValue({ _sum: { viewsCount: 0, likesCount: 0 } });

    const { req, res } = mockReqRes({ username: 'alice' });
    await getProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ username: 'alice' }));
  });
});

// ── updateProfile ─────────────────────────────────────────────────────────────
describe('updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when bio exceeds 200 characters', async () => {
    const { req, res } = mockReqRes({}, { bio: 'x'.repeat(201) }, { id: 1 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('200') }));
  });

  it('returns 400 when avatarUrl is not a valid https URL', async () => {
    const { req, res } = mockReqRes({}, { avatarUrl: 'javascript:alert(1)' }, { id: 1 });
    await updateProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid https avatarUrl', async () => {
    prisma.user.update.mockResolvedValue({
      id: 1, username: 'alice', email: 'a@b.com', avatarUrl: 'https://example.com/img.jpg', bio: null,
    });
    const { req, res } = mockReqRes({}, { avatarUrl: 'https://example.com/img.jpg' }, { id: 1 });
    await updateProfile(req, res);
    expect(res.json).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it('updates profile successfully with valid data', async () => {
    const updated = { id: 1, username: 'alice', email: 'a@b.com', avatarUrl: null, bio: 'New bio' };
    prisma.user.update.mockResolvedValue(updated);

    const { req, res } = mockReqRes({}, { bio: 'New bio' }, { id: 1 });
    await updateProfile(req, res);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ bio: 'New bio' }));
  });
});

// ── getUserTopics ─────────────────────────────────────────────────────────────
describe('getUserTopics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { req, res } = mockReqRes({ username: 'nobody' });
    await getUserTopics(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns topics list for existing user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, username: 'alice' });
    prisma.topic.findMany.mockResolvedValue([
      { id: 1, title: 'Topic A', likesCount: 5, viewsCount: 20, createdAt: new Date(), category: { name: 'Tech', slug: 'tech' }, _count: { slides: 3 } },
    ]);

    const { req, res } = mockReqRes({ username: 'alice' });
    await getUserTopics(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ title: 'Topic A' }),
    ]));
  });
});
