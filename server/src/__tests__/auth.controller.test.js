/**
 * Unit tests for auth.controller.js
 *
 * Install deps first:
 *   npm install --save-dev jest
 *
 * Run with:
 *   npx jest src/__tests__/auth.controller.test.js
 */

// ── Mock Prisma before any imports ────────────────────────────────────────────
jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

// Mock badge service (fire-and-forget, not under test here)
jest.mock('../services/badge.service', () => ({
  awardBadge: jest.fn().mockResolvedValue(undefined),
  checkBadges: jest.fn().mockResolvedValue(undefined),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
}));

const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { register, login, me } = require('../controllers/auth.controller');

// Helper to create mock Express req/res objects
function mockReqRes(body = {}, user = null) {
  const req = { body, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ── register ──────────────────────────────────────────────────────────────────
describe('register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const { req, res } = mockReqRes({ username: 'alice' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('returns 400 for invalid username (too short)', async () => {
    const { req, res } = mockReqRes({ username: 'ab', email: 'a@b.com', password: 'password123' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for username with special characters', async () => {
    const { req, res } = mockReqRes({ username: 'alice!', email: 'a@b.com', password: 'password123' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for password shorter than 8 chars', async () => {
    const { req, res } = mockReqRes({ username: 'alice', email: 'a@b.com', password: 'short' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid email format', async () => {
    const { req, res } = mockReqRes({ username: 'alice', email: 'not-an-email', password: 'password123' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 409 when username/email already exists', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1, username: 'alice' });
    const { req, res } = mockReqRes({ username: 'alice', email: 'alice@test.com', password: 'password123' });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('creates user and returns 201 with token on success', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 1, username: 'alice', email: 'alice@test.com', avatarUrl: null, isAdmin: false,
    });

    const { req, res } = mockReqRes({ username: 'alice', email: 'alice@test.com', password: 'password123' });
    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: 'mock.jwt.token',
      user: expect.objectContaining({ username: 'alice' }),
    }));
  });
});

// ── login ─────────────────────────────────────────────────────────────────────
describe('login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { req, res } = mockReqRes({ email: 'nobody@test.com', password: 'pass' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 on wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1, email: 'alice@test.com', passwordHash: 'hash', isBanned: false, isAdmin: false,
    });
    bcrypt.compare.mockResolvedValue(false);

    const { req, res } = mockReqRes({ email: 'alice@test.com', password: 'wrongpass' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user is banned', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1, email: 'alice@test.com', passwordHash: 'hash', isBanned: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    const { req, res } = mockReqRes({ email: 'alice@test.com', password: 'password123' });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns token and user on valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1, username: 'alice', email: 'alice@test.com', passwordHash: 'hash',
      avatarUrl: null, isAdmin: false, isBanned: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    const { req, res } = mockReqRes({ email: 'alice@test.com', password: 'password123' });
    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: 'mock.jwt.token',
      user: expect.objectContaining({ username: 'alice' }),
    }));
  });
});

// ── me ────────────────────────────────────────────────────────────────────────
describe('me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns anonymous payload when no auth user', async () => {
    const { req, res } = mockReqRes({}, null);
    await me(req, res);
    expect(res.json).toHaveBeenCalledWith({ authenticated: false, user: null });
  });

  it('returns anonymous payload when user not found in DB', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { req, res } = mockReqRes({}, { id: 99 });
    await me(req, res);
    expect(res.json).toHaveBeenCalledWith({ authenticated: false, user: null });
  });

  it('returns user data when found', async () => {
    const mockUser = { id: 1, username: 'alice', email: 'alice@test.com', avatarUrl: null, bio: null, createdAt: new Date(), isAdmin: false };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const { req, res } = mockReqRes({}, { id: 1 });
    await me(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      authenticated: true,
      user: expect.objectContaining({ username: 'alice' }),
    }));
  });
});
