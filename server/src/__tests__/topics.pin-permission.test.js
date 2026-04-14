jest.mock('../lib/prisma', () => ({
  topic: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  slide: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');
const { pinSlide } = require('../controllers/topics.controller');

function mockReqRes(params = {}, body = {}, user = null) {
  const req = { params, body, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('pinSlide owner authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for non-owner non-admin user', async () => {
    prisma.topic.findUnique.mockResolvedValue({ id: 10, userId: 1 });

    const { req, res } = mockReqRes({ id: '10' }, { slideId: 55 }, { id: 2, isAdmin: false });
    await pinSlide(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.topic.update).not.toHaveBeenCalled();
  });

  it('pins slide for topic owner', async () => {
    prisma.topic.findUnique.mockResolvedValue({ id: 10, userId: 1 });
    prisma.slide.findUnique.mockResolvedValue({ id: 55, topicId: 10, isHidden: false, deletedAt: null });
    prisma.topic.update.mockResolvedValue({ id: 10, pinnedSlideId: 55 });

    const { req, res } = mockReqRes({ id: '10' }, { slideId: 55 }, { id: 1, isAdmin: false });
    await pinSlide(req, res);

    expect(prisma.topic.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { pinnedSlideId: 55 },
      select: expect.any(Object),
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pinnedSlideId: 55 }));
  });

  it('unpinned when owner sends null slideId', async () => {
    prisma.topic.findUnique.mockResolvedValue({ id: 10, userId: 1 });
    prisma.topic.update.mockResolvedValue({ id: 10, pinnedSlideId: null });

    const { req, res } = mockReqRes({ id: '10' }, { slideId: null }, { id: 1, isAdmin: false });
    await pinSlide(req, res);

    expect(prisma.topic.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { pinnedSlideId: null },
      select: expect.any(Object),
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pinnedSlideId: null }));
  });
});
