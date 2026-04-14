const fs = require('fs');
const path = require('path');
const pdfParse = require('../lib/pdf-parse');
const prisma = require('../lib/prisma');
const { enqueueSlideConversion } = require('../services/conversion.service');
const { toSlug, uniqueSlug } = require('../lib/slug');
const { sanitizeText } = require('../lib/sanitize');
const { cleanupUploadedFile } = require('../middleware/upload');
const { putLocalFile, isRemoteEnabled } = require('../services/storage.service');
const { notifyTopicSubscribers } = require('../services/topic-subscription.service');
const { invalidateHotFeedCache } = require('../services/slideo-feed-cache.service');

const toUploadAbsPath = (urlPath) => {
  if (!urlPath || typeof urlPath !== 'string') return null;
  const normalized = urlPath.replace(/^\/+/, '');
  return path.join(__dirname, '../../', normalized);
};

const normalizePageIndices = (raw) => {
  if (!Array.isArray(raw)) return [];
  const numbers = raw
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(numbers)].sort((a, b) => a - b);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPdfPageCount = async (pdfUrl) => {
  if (!pdfUrl) return null;
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const isRemote = /^https?:\/\//i.test(pdfUrl);
      let pdfBuffer = null;
      if (isRemote) {
        const upstream = await fetch(pdfUrl);
        if (!upstream.ok) throw new Error('Remote PDF fetch failed');
        pdfBuffer = Buffer.from(await upstream.arrayBuffer());
      } else {
        const pdfPath = toUploadAbsPath(pdfUrl);
        if (!pdfPath || !fs.existsSync(pdfPath)) throw new Error('PDF file not found');
        pdfBuffer = await fs.promises.readFile(pdfPath);
      }
      const parsed = await pdfParse(pdfBuffer);
      const pages = Number(parsed?.numpages || 0);
      if (Number.isInteger(pages) && pages > 0) return pages;
      throw new Error('PDF pages unavailable');
    } catch (err) {
      lastError = err;
      if (attempt < 4) await sleep(350 * attempt);
    }
  }
  if (lastError) {
    console.warn('[slideo-v3] getPdfPageCount failed:', String(lastError?.message || lastError));
  }
  return null;
};

const ensureSessionOwnership = async (sessionId, userId) => {
  const session = await prisma.slideoSession.findUnique({
    where: { id: sessionId },
    include: {
      slide: {
        select: {
          id: true,
          userId: true,
          pdfUrl: true,
          conversionStatus: true,
          isHidden: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!session) return { error: { code: 404, message: 'Session not found' } };
  if (session.userId !== userId) return { error: { code: 403, message: 'Forbidden' } };
  return { session };
};

const createSession = async (req, res) => {
  // Tracks whether a slide DB record was created; used in catch to decide file cleanup.
  // In local mode the file IS the permanent storage -- only delete it if no slide references it yet.
  let slideDbCreated = false;
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya zorunlu' });

    const ext = path.extname(String(req.file.originalname || '')).toLowerCase();
    if (!['.ppt', '.pptx'].includes(ext)) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Sadece .ppt veya .pptx destekleniyor' });
    }

    const categoryIdNum = Number(req.body?.categoryId);
    const slideTitle = sanitizeText(req.body?.slideTitle, 180);
    const topicTitleInput = sanitizeText(req.body?.topicTitle, 120);

    if (!slideTitle) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Başlık zorunlu' });
    }
    if (!Number.isInteger(categoryIdNum) || categoryIdNum <= 0) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Geçerli kategori zorunlu' });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryIdNum },
      select: { id: true },
    });
    if (!category) {
      cleanupUploadedFile(req.file);
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }

    const fileUrl = await putLocalFile(
      req.file.path,
      `slides/${req.file.filename}`,
      req.file.mimetype,
    );

    const topicTitle = topicTitleInput || `${req.user.username} Slideo Yüklemeleri`;
    let topic = await prisma.topic.findFirst({
      where: { userId: req.user.id, title: topicTitle, categoryId: categoryIdNum },
    });

    if (!topic) {
      const topicSlug = await uniqueSlug(prisma.topic, toSlug(topicTitle));
      topic = await prisma.topic.create({
        data: { userId: req.user.id, title: topicTitle, categoryId: categoryIdNum, slug: topicSlug },
      });
    }

    const slideSlug = await uniqueSlug(prisma.slide, toSlug(slideTitle));
    const slide = await prisma.slide.create({
      data: {
        title: slideTitle,
        slug: slideSlug,
        fileUrl,
        topicId: topic.id,
        userId: req.user.id,
      },
      select: { id: true, conversionStatus: true },
    });
    // File is now referenced by a DB record -- flag so catch block won't delete it in local mode
    slideDbCreated = true;

    const session = await prisma.slideoSession.create({
      data: {
        userId: req.user.id,
        slideId: slide.id,
        status: 'processing',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      select: { id: true, status: true, slideId: true, createdAt: true },
    });

    let enqueueError = null;
    try {
      await enqueueSlideConversion(slide.id);
    } catch (err) {
      enqueueError = String(err?.message || 'Conversion enqueue failed').slice(0, 500);
      await prisma.slideoSession.update({
        where: { id: session.id },
        data: { status: 'failed', error: enqueueError },
      }).catch(() => {});
      await prisma.slide.update({
        where: { id: slide.id },
        data: { conversionStatus: 'failed' },
      }).catch(() => {});
    }

    notifyTopicSubscribers({
      topicId: topic.id,
      actorUserId: req.user.id,
      slideTitle,
    });

    if (isRemoteEnabled()) cleanupUploadedFile(req.file);

    return res.status(201).json({
      sessionId: session.id,
      slideId: session.slideId,
      status: enqueueError ? 'failed' : 'processing',
      error: enqueueError,
    });
  } catch (err) {
    // Remote mode: always delete the temp file (it was uploaded to S3 or is still a tmp).
    // Local mode: only delete the file if no slide DB record was created yet; once a slide
    // references req.file.path as its permanent fileUrl, deletion would corrupt the record.
    if (isRemoteEnabled() || !slideDbCreated) cleanupUploadedFile(req.file);
    console.error(err);
    return res.status(500).json({ error: 'Slideo oturumu oluşturulamadı' });
  }
};

const getSessionStatus = async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: 'Invalid session id' });
    }

    const { session, error } = await ensureSessionOwnership(sessionId, req.user.id);
    if (error) return res.status(error.code).json({ error: error.message });

    let status = session.status;
    let sessionError = session.error || null;
    const conversionStatus = session.slide?.conversionStatus || 'pending';

    if (!['published', 'canceled'].includes(status)) {
      if (['failed', 'unsupported'].includes(conversionStatus)) {
        status = 'failed';
        const job = await prisma.conversionJob.findUnique({
          where: { slideId: session.slideId },
          select: { lastError: true },
        });
        sessionError = sessionError || job?.lastError || 'Dönüşüm başarısız';
      } else if (conversionStatus === 'done') {
        status = 'done';
      } else {
        status = 'processing';
      }
    }

    if (status !== session.status || sessionError !== (session.error || null)) {
      await prisma.slideoSession.update({
        where: { id: sessionId },
        data: {
          status,
          error: sessionError,
        },
      });
    }

    return res.json({
      sessionId,
      slideId: session.slideId,
      status,
      conversionStatus,
      error: sessionError,
      publishedSlideoId: session.publishedSlideoId || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Session durumu alınamadı' });
  }
};

const getSessionPreviewMeta = async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: 'Invalid session id' });
    }

    const { session, error } = await ensureSessionOwnership(sessionId, req.user.id);
    if (error) return res.status(error.code).json({ error: error.message });

    if (session.slide?.conversionStatus !== 'done' || !session.slide?.pdfUrl) {
      return res.status(409).json({ error: 'Preview henüz hazır değil' });
    }

    const pageCount = await getPdfPageCount(session.slide.pdfUrl);
    if (!pageCount) {
      return res.status(409).json({ error: 'PDF sayfa sayısı okunamadı. Lütfen kısa süre sonra tekrar deneyin.' });
    }

    await prisma.slideoSession.update({
      where: { id: sessionId },
      data: {
        status: 'done',
        pageCount,
        error: null,
      },
    });

    return res.json({
      sessionId,
      slideId: session.slideId,
      pageCount,
      previewUrl: `/api/slides/${session.slideId}/pdf`,
      conversionStatus: 'done',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Preview metadata alınamadı' });
  }
};

const publishSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: 'Invalid session id' });
    }

    const { session, error } = await ensureSessionOwnership(sessionId, req.user.id);
    if (error) return res.status(error.code).json({ error: error.message });

    if (!session.slide || session.slide.deletedAt || session.slide.isHidden) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    if (session.slide.conversionStatus !== 'done' || !session.slide.pdfUrl) {
      return res.status(409).json({ error: 'Dönüşüm tamamlanmadı' });
    }
    if (session.status === 'published' && session.publishedSlideoId) {
      return res.json({
        ok: true,
        alreadyPublished: true,
        slideoId: session.publishedSlideoId,
      });
    }

    const title = sanitizeText(req.body?.title, 180);
    const description = sanitizeText(req.body?.description, 1000) || null;
    const normalizedPages = normalizePageIndices(req.body?.pageIndices);
    if (!title) return res.status(400).json({ error: 'Slideo başlığı zorunlu' });
    if (normalizedPages.length < 3 || normalizedPages.length > 7) {
      return res.status(400).json({ error: '3-7 arası sayfa seçilmeli' });
    }

    const totalPages = session.pageCount || (await getPdfPageCount(session.slide.pdfUrl));
    if (!totalPages) return res.status(409).json({ error: 'PDF sayfa sayısı okunamadı. Lütfen kısa süre sonra tekrar deneyin.' });
    if (normalizedPages[normalizedPages.length - 1] > totalPages) {
      return res.status(400).json({ error: `Sayfa numarası geçersiz (max ${totalPages})` });
    }

    const normalizedCover = Number(req.body?.coverPage);
    const resolvedCover = normalizedPages.includes(normalizedCover) ? normalizedCover : normalizedPages[0];

    const slideo = await prisma.slideo.create({
      data: {
        userId: req.user.id,
        slideId: session.slideId,
        title,
        description,
        pageIndices: JSON.stringify(normalizedPages),
        coverPage: resolvedCover,
      },
      select: {
        id: true,
        title: true,
        coverPage: true,
        pageIndices: true,
        createdAt: true,
      },
    });

    await prisma.slideoSession.update({
      where: { id: sessionId },
      data: {
        status: 'published',
        pageCount: totalPages,
        publishedSlideoId: slideo.id,
        error: null,
      },
    });
    invalidateHotFeedCache();

    return res.status(201).json({
      ok: true,
      sessionId,
      slideoId: slideo.id,
      slideo,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Slideo yayınlanamadı' });
  }
};

// POST /api/slideo-v3/from-slide
// Creates a Slideo from an already-converted slide in the user's library.
// Does NOT require a session -- the slide must already have conversionStatus='done'.
const createFromSlide = async (req, res) => {
  try {
    const slideId = Number(req.body?.slideId);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Geçerli bir slideId zorunlu' });
    }

    const title = sanitizeText(req.body?.title, 180);
    const description = sanitizeText(req.body?.description, 1000) || null;
    const normalizedPages = normalizePageIndices(req.body?.pageIndices);

    if (!title) return res.status(400).json({ error: 'Başlık zorunlu' });
    if (normalizedPages.length < 3 || normalizedPages.length > 7) {
      return res.status(400).json({ error: '3-7 arası sayfa seçilmeli' });
    }

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, userId: true, pdfUrl: true, conversionStatus: true, isHidden: true, deletedAt: true },
    });
    if (!slide || slide.deletedAt || slide.isHidden) {
      return res.status(404).json({ error: 'Slayt bulunamadı' });
    }
    if (slide.userId !== req.user.id) {
      return res.status(403).json({ error: 'Bu slayt size ait değil' });
    }
    if (slide.conversionStatus !== 'done' || !slide.pdfUrl) {
      return res.status(409).json({ error: 'Slayt henüz PDF\'e dönüştürülmedi' });
    }

    const totalPages = await getPdfPageCount(slide.pdfUrl);
    if (!totalPages) {
      return res.status(409).json({ error: 'PDF sayfa sayısı okunamadı. Lütfen kısa süre sonra tekrar deneyin.' });
    }
    if (normalizedPages[normalizedPages.length - 1] > totalPages) {
      return res.status(400).json({ error: `Sayfa numarası geçersiz (max ${totalPages})` });
    }

    const normalizedCover = Number(req.body?.coverPage);
    const resolvedCover = normalizedPages.includes(normalizedCover) ? normalizedCover : normalizedPages[0];

    const slideo = await prisma.slideo.create({
      data: {
        userId: req.user.id,
        slideId,
        title,
        description,
        pageIndices: JSON.stringify(normalizedPages),
        coverPage: resolvedCover,
      },
      select: {
        id: true,
        title: true,
        coverPage: true,
        pageIndices: true,
        createdAt: true,
      },
    });
    invalidateHotFeedCache();

    return res.status(201).json({ ok: true, slideoId: slideo.id, slideo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Slideo oluşturulamadı' });
  }
};

module.exports = {
  createSession,
  getSessionStatus,
  getSessionPreviewMeta,
  publishSession,
  createFromSlide,
};

