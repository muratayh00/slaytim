const buckets = new Map();

function now() {
  return Date.now();
}

function getBucket(name) {
  if (!buckets.has(name)) {
    buckets.set(name, new Map());
  }
  return buckets.get(name);
}

function get(name, key) {
  const bucket = getBucket(name);
  const entry = bucket.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    bucket.delete(key);
    return null;
  }
  return entry.value;
}

function set(name, key, value, ttlMs) {
  const bucket = getBucket(name);
  bucket.set(key, {
    value,
    expiresAt: now() + Math.max(100, Number(ttlMs || 0)),
  });
}

function del(name, key) {
  getBucket(name).delete(key);
}

function clear(name) {
  if (!name) {
    buckets.clear();
    return;
  }
  buckets.delete(name);
}

module.exports = {
  get,
  set,
  del,
  clear,
};

