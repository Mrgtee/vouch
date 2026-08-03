export function createRateLimiter(options = {}) {
  const settings = {
    enabled: options.enabled !== false,
    windowMs: positiveInteger(options.windowMs, 60_000),
    publicMax: positiveInteger(options.publicMax, 120),
    packetMax: positiveInteger(options.packetMax, 30),
    packetPaths: new Set(options.packetPaths ?? []),
    now: typeof options.now === "function" ? options.now : Date.now
  };
  const buckets = new Map();

  return function rateLimiter(request, response, next) {
    if (!settings.enabled || request.method === "OPTIONS") {
      next();
      return;
    }

    const path = request.path || request.url || "";
    if (path === "/health") {
      next();
      return;
    }

    const limit = settings.packetPaths.has(path) ? settings.packetMax : settings.publicMax;
    if (limit <= 0) {
      next();
      return;
    }

    const now = settings.now();
    const key = buildBucketKey(request, path);
    const bucket = getBucket(buckets, key, now, settings.windowMs);
    bucket.count += 1;

    const remaining = Math.max(0, limit - bucket.count);
    response.setHeader("ratelimit-limit", String(limit));
    response.setHeader("ratelimit-remaining", String(remaining));
    response.setHeader("ratelimit-reset", String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > limit) {
      response.setHeader("retry-after", String(Math.ceil((bucket.resetAt - now) / 1000)));
      response.status(429).json({
        error: "rate_limited",
        message: "Too many requests. Please retry shortly."
      });
      return;
    }

    pruneBuckets(buckets, now);
    next();
  };
}

function getBucket(buckets, key, now, windowMs) {
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) {
    return existing;
  }

  const bucket = { count: 0, resetAt: now + windowMs };
  buckets.set(key, bucket);
  return bucket;
}

function buildBucketKey(request, path) {
  const ip = request.ip || request.socket?.remoteAddress || "unknown";
  return ip + ":" + path;
}

function pruneBuckets(buckets, now) {
  if (buckets.size < 1_000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
