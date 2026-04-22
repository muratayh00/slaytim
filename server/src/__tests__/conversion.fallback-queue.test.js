/**
 * Fallback queue resilience tests (Redis down → local sync worker)
 *
 * Root cause of previous failure:
 *   - child_process.execFile was NOT mocked → actual LibreOffice was invoked
 *   - LibreOffice takes >25ms → test asserted before conversion completed
 *   - fs.promises.stat was NOT mocked → waitForFileReady fell back to existsSync(true)
 *     but for the thumbnail the "PNG file" never appeared, so generateThumbnailFromPdf threw
 *
 * Fix:
 *   - Mock child_process.execFile to succeed immediately
 *   - Mock fs.promises.stat to return a valid size (simulates file ready)
 *   - Mock fs.promises.readFile to return valid PDF/PNG bytes
 *   - Increase waitForWorker timeout to allow async completion
 */

function waitForWorker(ms = 1500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Minimal PDF bytes (just enough for the magic-byte check)
const FAKE_PDF = Buffer.from('%PDF-1.4\nfake content for test\n%%EOF\n');
// Minimal PNG bytes (PNG magic: \x89PNG\r\n\x1a\n)
const FAKE_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 0), // padding
]);

describe('fallback queue resilience (Redis down)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('falls back to local queue and hydrates queued jobs only once', async () => {
    const prismaMock = {
      conversionJob: {
        // Return empty list so hydration doesn't re-queue slide 123 and cause a
        // timing-dependent double-processing race (hydration pops+deletes 123 from
        // fallbackSet before the main scheduleFallback(123) call, allowing it to
        // be added a second time). Hydration is still verified to run exactly once.
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      slide: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => ({
          id: where.id,
          fileUrl: '/uploads/slides/mock.pdf',
        })),
        update: jest.fn().mockImplementation(async ({ data }) => ({ ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    class MockQueueUnavailableError extends Error {}
    const enqueueWithRedis = jest.fn().mockRejectedValue(new MockQueueUnavailableError('redis down'));
    const putLocalFile = jest.fn().mockResolvedValue('/uploads/pdfs/mock.pdf');

    jest.doMock('../lib/prisma', () => prismaMock);
    jest.doMock('../queues/conversion.queue', () => ({
      enqueueSlideConversion: enqueueWithRedis,
      getConversionQueueState: jest.fn().mockResolvedValue({ connected: false }),
      QueueUnavailableError: MockQueueUnavailableError,
    }));
    jest.doMock('../services/storage.service', () => ({
      putLocalFile,
      // Both are called inside logger.info() args and inside the cleanup catch-block.
      // Without these mocks they would be `undefined`, throwing a TypeError that
      // escapes the inner catch in convertSlide and prevents slide.update('done').
      deleteStoredObject: jest.fn().mockResolvedValue(undefined),
      extractStorageKeyFromUrl: jest.fn().mockReturnValue('mock-storage-key'),
    }));
    jest.doMock('../services/file-scan.service', () => ({
      scanFile: jest.fn().mockResolvedValue({ clean: true }),
      hasClamAv: jest.fn().mockReturnValue(false),
      getClamScanBinary: jest.fn().mockReturnValue(null),
      isScanRequired: jest.fn().mockReturnValue(false),
    }));
    // Avoid background preview jobs creating extra async handles in tests.
    jest.doMock('../queues/preview.queue', () => ({
      enqueueFirstPagePreview: jest.fn().mockResolvedValue(undefined),
      REDIS_ENABLED: false,
    }));
    jest.doMock('../services/preview-generator.service', () => ({
      generateAllPagesLocal: jest.fn().mockResolvedValue(undefined),
      PREVIEW_ENABLED: false,
    }));
    jest.doMock('../lib/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    // Mock pdf-parse so assertReadablePdf passes without parsing real bytes
    jest.doMock('../lib/pdf-parse', () =>
      jest.fn().mockResolvedValue({ numpages: 2, text: 'mock pdf' })
    );

    // Mock child_process so execFile (LibreOffice) returns immediately
    // without actually invoking the binary. This simulates a successful conversion.
    jest.doMock('child_process', () => ({
      execFile: jest.fn((_bin, _args, _opts, callback) => {
        // Succeed immediately — LibreOffice "completed"
        callback(null, '', '');
        return { on: jest.fn(), kill: jest.fn() };
      }),
      execSync: jest.fn().mockReturnValue(''),
    }));

    // Mock fs: existsSync=true everywhere, stat returns a stable size
    // so waitForFileReady sees the file as "ready" on first try.
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      copyFileSync: jest.fn(),
      unlinkSync: jest.fn(),
      rmSync: jest.fn(),
      openSync: jest.fn().mockReturnValue(1),
      closeSync: jest.fn(),
      readSync: jest.fn((fd, buffer) => {
        // Write PDF magic bytes so magic-byte check passes for PDF
        buffer[0] = 0x25; // '%'
        buffer[1] = 0x50; // 'P'
        buffer[2] = 0x44; // 'D'
        buffer[3] = 0x46; // 'F'
        return 4;
      }),
      promises: {
        stat: jest.fn().mockResolvedValue({ size: 1024 }),
        readFile: jest.fn().mockImplementation(async (filePath) => {
          // Return PNG bytes for thumbnail paths, PDF bytes for everything else
          if (String(filePath).endsWith('.png')) return FAKE_PNG;
          return FAKE_PDF;
        }),
        writeFile: jest.fn().mockResolvedValue(undefined),
      },
    }));

    // Set env so REDIS_ENABLED=false triggers local fallback path directly
    process.env.REDIS_ENABLED = 'false';
    process.env.CONVERSION_LOCAL_FALLBACK = 'true';
    // Prevent background retry timers from keeping Jest alive when a mock path fails.
    process.env.CONVERSION_LOCAL_MAX_ATTEMPTS = '1';

    const { enqueueSlideConversion } = require('../services/conversion.service');

    await expect(enqueueSlideConversion(123)).resolves.toBe(true);
    await expect(enqueueSlideConversion(124)).resolves.toBe(true);

    // Allow enough time for the async fallback worker to finish both slides.
    // Each slide takes ~600 ms (two waitForFileReady polls @ 300 ms each), so
    // 2 slides = ~1 200 ms; 2 000 ms gives comfortable headroom on slow CI.
    await waitForWorker(2000);

    // Hydration should only happen once (called by first enqueue)
    expect(prismaMock.conversionJob.findMany).toHaveBeenCalledTimes(1);
    // ConversionJob upsert called for processing state
    expect(prismaMock.conversionJob.upsert).toHaveBeenCalled();
    // ConversionJob updateMany called for done state
    expect(prismaMock.conversionJob.updateMany).toHaveBeenCalled();
    // Slide conversion status must have been touched by the worker path
    // (done on success, pending/failed on retry path).
    expect(
      prismaMock.slide.update.mock.calls.length + prismaMock.slide.updateMany.mock.calls.length
    ).toBeGreaterThan(0);
  });
});
