jest.mock('../lib/prisma', () => ({
  slide: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');
const { trackDownload } = require('../controllers/slides.controller');

function mockReqRes(params = {}) {
  const req = { params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('trackDownload integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('increments downloadsCount and returns ok', async () => {
    prisma.slide.findUnique.mockResolvedValue({ id: 42, isHidden: false, deletedAt: null });
    prisma.slide.update.mockResolvedValue({ id: 42, downloadsCount: 8 });

    const { req, res } = mockReqRes({ id: '42' });
    await trackDownload(req, res);

    expect(prisma.slide.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
      select: { id: true, isHidden: true, deletedAt: true },
    });
    expect(prisma.slide.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { downloadsCount: { increment: 1 } },
    });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
