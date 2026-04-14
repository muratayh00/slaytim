const { canonicalIdSlug } = require('./slug');

function topicPath(topic) {
  const id = Number(topic?.id);
  const base = topic?.slug || topic?.title || String(id);
  return `/konu/${canonicalIdSlug(id, base)}`;
}

function slidePath(slide) {
  const id = Number(slide?.id);
  const base = slide?.slug || slide?.title || String(id);
  return `/slayt/${canonicalIdSlug(id, base)}`;
}

function profilePath(username) {
  return `/@${encodeURIComponent(String(username || '').trim())}`;
}

module.exports = {
  topicPath,
  slidePath,
  profilePath,
};

