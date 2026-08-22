/**
 * Express Middleware for Server-Side Route Response Caching
 * 
 * Intercepts GET requests, checks Node.js ServerCache, and responds in microseconds if cached.
 * On cache miss, captures the response and saves it with a TTL.
 */

import serverCache from '../utils/serverCache.js';

export function routeCache(ttlSeconds = 120, keyPrefix = '') {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user?.id || req.user?._id || 'public';
    const cacheKey = `${keyPrefix}:${userId}:${req.originalUrl || req.url}`;

    const cachedData = serverCache.get(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json to store response in server cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body) {
        serverCache.set(cacheKey, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}

export function invalidateCache(prefix) {
  return (req, res, next) => {
    const userId = req.user?.id || req.user?._id || 'public';
    serverCache.invalidatePrefix(`${prefix}:${userId}`);
    next();
  };
}
