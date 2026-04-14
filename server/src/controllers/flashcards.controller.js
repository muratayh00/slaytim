const prisma = require('../lib/prisma');
const { sanitizeText } = require('../lib/sanitize');
const logger = require('../lib/logger');

const VALID_MODES = new Set(['two', 'four']);

const baseSetSelect = {
  id: true,
  slideId: true,
  userId: true,
  title: true,
  mode: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
  questions: {
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      orderIndex: true,
      prompt: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      explanation: true,
      createdAt: true,
    },
  },
};

const toQuestionPayload = (rawQuestion, mode, index) => {
  const prompt = sanitizeText(rawQuestion?.prompt, 500);
  const explanation = sanitizeText(rawQuestion?.explanation, 800) || null;
  const rawOptions = Array.isArray(rawQuestion?.options) ? rawQuestion.options : [];
  const requiredCount = mode === 'two' ? 2 : 4;
  if (!prompt || rawOptions.length !== requiredCount) return null;

  const normalizedOptions = rawOptions
    .map((x) => sanitizeText(x, 240))
    .filter(Boolean);
  if (normalizedOptions.length !== requiredCount) return null;

  const correctOption = Number(rawQuestion?.correctOption);
  if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= requiredCount) return null;

  return {
    orderIndex: index + 1,
    prompt,
    optionA: normalizedOptions[0],
    optionB: normalizedOptions[1],
    optionC: requiredCount === 4 ? normalizedOptions[2] : null,
    optionD: requiredCount === 4 ? normalizedOptions[3] : null,
    correctOption,
    explanation,
  };
};

const getSessionKey = (req, setId) => {
  const header = req.headers['x-quiz-session'];
  if (header) return `${setId}:s:${String(header).slice(0, 96)}`;
  const ip = req.ip || 'na';
  const ua = (req.headers['user-agent'] || 'na').slice(0, 80);
  return `${setId}:ip:${ip}:ua:${ua}`;
};

const canManageSet = (set, user) => Boolean(user && (set.userId === user.id || user.isAdmin));

const formatSetForPublic = (set) => ({
  ...set,
  questions: set.questions.map((q) => ({
    ...q,
    options: [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
  })),
});

const listForSlide = async (req, res) => {
  try {
    const slideId = Number(req.params.slideId);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }

    const sets = await prisma.flashcardSet.findMany({
      where: { slideId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: baseSetSelect,
    });

    return res.json(sets.map(formatSetForPublic));
  } catch (err) {
    logger.error('Failed to fetch flashcards', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
};

const listMineForSlide = async (req, res) => {
  try {
    const slideId = Number(req.params.slideId);
    if (!Number.isInteger(slideId) || slideId <= 0) {
      return res.status(400).json({ error: 'Invalid slide id' });
    }

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, userId: true },
    });
    if (!slide) return res.status(404).json({ error: 'Slide not found' });
    if (slide.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sets = await prisma.flashcardSet.findMany({
      where: { slideId },
      orderBy: { createdAt: 'desc' },
      select: baseSetSelect,
    });
    return res.json(sets.map(formatSetForPublic));
  } catch (err) {
    logger.error('Failed to fetch flashcards', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
};

const createForSlide = async (req, res) => {
  try {
    const slideId = Number(req.params.slideId);
    const title = sanitizeText(req.body?.title, 120);
    const mode = String(req.body?.mode || 'four').trim();
    const isPublished = req.body?.isPublished !== false;
    const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];

    if (!Number.isInteger(slideId) || slideId <= 0) return res.status(400).json({ error: 'Invalid slide id' });
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!VALID_MODES.has(mode)) return res.status(400).json({ error: 'Invalid mode' });
    if (rawQuestions.length < 1 || rawQuestions.length > 50) {
      return res.status(400).json({ error: 'Question count must be between 1 and 50' });
    }

    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { id: true, userId: true, isHidden: true },
    });
    if (!slide || slide.isHidden) return res.status(404).json({ error: 'Slide not found' });
    if (slide.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const questions = rawQuestions
      .map((q, idx) => toQuestionPayload(q, mode, idx))
      .filter(Boolean);
    if (questions.length !== rawQuestions.length) {
      return res.status(400).json({ error: 'Invalid question payload' });
    }

    const created = await prisma.flashcardSet.create({
      data: {
        slideId,
        userId: req.user.id,
        title,
        mode,
        isPublished,
        questions: { create: questions },
      },
      select: baseSetSelect,
    });
    return res.status(201).json(formatSetForPublic(created));
  } catch (err) {
    logger.error('Failed to create flashcards', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to create flashcards' });
  }
};

const updateSet = async (req, res) => {
  try {
    const setId = Number(req.params.setId);
    if (!Number.isInteger(setId) || setId <= 0) return res.status(400).json({ error: 'Invalid set id' });

    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      include: { questions: true },
    });
    if (!set) return res.status(404).json({ error: 'Flashcard set not found' });
    if (!canManageSet(set, req.user)) return res.status(403).json({ error: 'Forbidden' });

    const mode = req.body?.mode ? String(req.body.mode).trim() : set.mode;
    if (!VALID_MODES.has(mode)) return res.status(400).json({ error: 'Invalid mode' });

    const title = req.body?.title !== undefined ? sanitizeText(req.body.title, 120) : set.title;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const isPublished = req.body?.isPublished !== undefined ? Boolean(req.body.isPublished) : set.isPublished;
    const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : null;

    const txOps = [];
    txOps.push(prisma.flashcardSet.update({
      where: { id: setId },
      data: { title, mode, isPublished },
      select: { id: true },
    }));

    if (rawQuestions) {
      if (rawQuestions.length < 1 || rawQuestions.length > 50) {
        return res.status(400).json({ error: 'Question count must be between 1 and 50' });
      }
      const questions = rawQuestions
        .map((q, idx) => toQuestionPayload(q, mode, idx))
        .filter(Boolean);
      if (questions.length !== rawQuestions.length) {
        return res.status(400).json({ error: 'Invalid question payload' });
      }
      txOps.push(prisma.flashcardQuestion.deleteMany({ where: { setId } }));
      txOps.push(prisma.flashcardQuestion.createMany({
        data: questions.map((q) => ({ ...q, setId })),
      }));
    }

    await prisma.$transaction(txOps);

    const updated = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      select: baseSetSelect,
    });
    return res.json(formatSetForPublic(updated));
  } catch (err) {
    logger.error('Failed to update flashcards', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to update flashcards' });
  }
};

const submitAttempt = async (req, res) => {
  try {
    const setId = Number(req.params.setId);
    if (!Number.isInteger(setId) || setId <= 0) return res.status(400).json({ error: 'Invalid set id' });

    const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!set || !set.isPublished) return res.status(404).json({ error: 'Flashcard set not found' });
    if (!set.questions.length) return res.status(400).json({ error: 'This flashcard set has no questions' });

    const answerMap = new Map(
      rawAnswers
        .map((a) => [Number(a?.questionId), Number(a?.answerIndex)])
        .filter(([qid, idx]) => Number.isInteger(qid) && Number.isInteger(idx)),
    );

    let score = 0;
    const results = set.questions.map((q) => {
      const selected = answerMap.has(q.id) ? answerMap.get(q.id) : null;
      const isCorrect = selected === q.correctOption;
      if (isCorrect) score += 1;
      return {
        questionId: q.id,
        selected,
        correctOption: q.correctOption,
        isCorrect,
      };
    });

    await prisma.flashcardAttempt.create({
      data: {
        setId,
        userId: req.user?.id || null,
        sessionKey: getSessionKey(req, setId),
        score,
        total: set.questions.length,
      },
    });

    return res.json({
      score,
      total: set.questions.length,
      percent: Number(((score / set.questions.length) * 100).toFixed(2)),
      results,
    });
  } catch (err) {
    logger.error('Failed to submit flashcard attempt', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to submit flashcard attempt' });
  }
};

const getSetStats = async (req, res) => {
  try {
    const setId = Number(req.params.setId);
    if (!Number.isInteger(setId) || setId <= 0) return res.status(400).json({ error: 'Invalid set id' });

    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      select: { id: true, userId: true, title: true, mode: true, isPublished: true, createdAt: true },
    });
    if (!set) return res.status(404).json({ error: 'Flashcard set not found' });
    if (!canManageSet(set, req.user)) return res.status(403).json({ error: 'Forbidden' });

    const [attempts, agg] = await Promise.all([
      prisma.flashcardAttempt.findMany({
        where: { setId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, userId: true, score: true, total: true, createdAt: true },
      }),
      prisma.flashcardAttempt.aggregate({
        where: { setId },
        _avg: { score: true, total: true },
        _count: { _all: true },
      }),
    ]);

    const avgPercent = attempts.length
      ? Number(
          (
            attempts.reduce((acc, a) => acc + (a.total ? (a.score / a.total) * 100 : 0), 0) / attempts.length
          ).toFixed(2),
        )
      : 0;

    return res.json({
      set,
      totalAttempts: agg._count._all || 0,
      avgPercent,
      attempts,
    });
  } catch (err) {
    logger.error('Failed to fetch flashcard stats', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch flashcard stats' });
  }
};

module.exports = {
  listForSlide,
  listMineForSlide,
  createForSlide,
  updateSet,
  submitAttempt,
  getSetStats,
};

