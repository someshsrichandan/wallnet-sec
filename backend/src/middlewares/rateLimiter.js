const HttpError = require('../utils/httpError');

const createRateLimiter = (options = {}) => {
  const { windowMs = 60_000, max = 100, keyPrefix = 'global' } = options;
  const requestStore = new Map();

  return (req, _res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || 'unknown'}`;
    const current = requestStore.get(key);

    if (requestStore.size > 10_000) {
      for (const [storedKey, value] of requestStore.entries()) {
        if (value.resetAt <= now) {
          requestStore.delete(storedKey);
        }
      }
    }

    if (!current || current.resetAt <= now) {
      requestStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      return next(new HttpError(429, 'Too many requests, please try again shortly'));
    }

    current.count += 1;
    requestStore.set(key, current);
    return next();
  };
};

module.exports = createRateLimiter;
