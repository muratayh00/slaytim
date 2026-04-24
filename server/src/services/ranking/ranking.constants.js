const EVENT_WEIGHTS = {
  impression: 0.1,
  view_start: 0.5,
  watch_3s: 1.0,
  watch_10s: 2.0,
  completion: 5.0,
  like: 2.0,
  save: 4.0,
  share: 5.0,
  comment: 3.0,
  skip_fast: -2.5,
  report: -6.0,
};

const ALLOWED_CONTENT_TYPES = new Set(['slide', 'slideo', 'topic']);
const ALLOWED_EVENT_TYPES = new Set(Object.keys(EVENT_WEIGHTS));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const recencyScore = (createdAt, halfLifeDays = 7) => {
  const ageMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const score = Math.exp(-ageDays / halfLifeDays);
  return clamp(score, 0, 1);
};

const contentScore = ({ watchTimeNorm = 0, completionRate = 0, likeRate = 0, saveRate = 0, commentRate = 0, shareRate = 0, fastSkipRate = 0, reportRate = 0 }) =>
  (watchTimeNorm * 3)
  + (completionRate * 5)
  + (likeRate * 2)
  + (saveRate * 4)
  + (commentRate * 3)
  + (shareRate * 5)
  - (fastSkipRate * 4)
  - (reportRate * 6);

module.exports = {
  EVENT_WEIGHTS,
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EVENT_TYPES,
  clamp,
  recencyScore,
  contentScore,
};
