function mockQueueFactory(addMock, getJobsImpl) {
  return jest.fn().mockImplementation(() => ({
    add: addMock,
    getJobs: getJobsImpl,
    getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, failed: 0, completed: 0, delayed: 0, paused: 0 }),
    close: jest.fn(),
  }));
}

describe('conversion.queue atomic enqueue + reconcile', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.REDIS_ENABLED = 'true';
  });

  it('writes DB queued state only after successful queue add', async () => {
    const addMock = jest.fn().mockResolvedValue({ id: 'slide-12' });
    const getJobsMock = jest.fn().mockResolvedValue([]);

    const prismaMock = {
      conversionJob: { upsert: jest.fn().mockResolvedValue({}) },
      slide: { update: jest.fn().mockResolvedValue({}) },
    };

    jest.doMock('bullmq', () => ({ Queue: mockQueueFactory(addMock, getJobsMock) }));
    jest.doMock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn(), quit: jest.fn() })));
    jest.doMock('../lib/prisma', () => prismaMock);
    jest.doMock('../lib/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

    const { enqueueSlideConversion } = require('../queues/conversion.queue');
    await expect(enqueueSlideConversion(12)).resolves.toBe(true);

    expect(addMock).toHaveBeenCalledWith('convert-slide', { slideId: 12 }, { jobId: 'slide-12' });
    expect(prismaMock.conversionJob.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.slide.update).toHaveBeenCalledTimes(1);
  });

  it('does not mark DB queued when queue add fails', async () => {
    const addMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED redis down'));
    const getJobsMock = jest.fn().mockResolvedValue([]);

    const prismaMock = {
      conversionJob: { upsert: jest.fn().mockResolvedValue({}) },
      slide: { update: jest.fn().mockResolvedValue({}) },
    };

    jest.doMock('bullmq', () => ({ Queue: mockQueueFactory(addMock, getJobsMock) }));
    jest.doMock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn(), quit: jest.fn() })));
    jest.doMock('../lib/prisma', () => prismaMock);
    jest.doMock('../lib/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

    const { enqueueSlideConversion, QueueUnavailableError } = require('../queues/conversion.queue');
    await expect(enqueueSlideConversion(22)).rejects.toBeInstanceOf(QueueUnavailableError);

    expect(prismaMock.conversionJob.upsert).not.toHaveBeenCalled();
    expect(prismaMock.slide.update).not.toHaveBeenCalled();
  });

  it('re-enqueues missing DB queued/pending jobs after restart reconciliation', async () => {
    const addMock = jest.fn().mockResolvedValue({});
    const getJobsMock = jest.fn()
      .mockResolvedValueOnce([{ data: { slideId: 1 } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const prismaMock = {
      conversionJob: {
        findMany: jest.fn().mockResolvedValue([{ slideId: 1 }, { slideId: 2 }]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      slide: {
        findMany: jest.fn().mockResolvedValue([{ id: 3 }]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    jest.doMock('bullmq', () => ({ Queue: mockQueueFactory(addMock, getJobsMock) }));
    jest.doMock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn(), quit: jest.fn() })));
    jest.doMock('../lib/prisma', () => prismaMock);
    jest.doMock('../lib/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

    const { reconcileMissingConversionJobs } = require('../queues/conversion.queue');
    const result = await reconcileMissingConversionJobs({ limit: 50 });

    expect(result.missingCount).toBe(2);
    expect(result.reEnqueued).toBe(2);
    expect(addMock).toHaveBeenCalledWith('convert-slide', { slideId: 2 }, { jobId: 'slide-2' });
    expect(addMock).toHaveBeenCalledWith('convert-slide', { slideId: 3 }, { jobId: 'slide-3' });
  });
});
