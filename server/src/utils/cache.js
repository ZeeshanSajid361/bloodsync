/**
 * Server-Side In-Memory Cache — sub-millisecond response caching for warm serverless instances.
 *
 * Prevents redundant MongoDB Atlas queries for read-heavy routes (e.g. search,
 * public hospital directory, compatibility, donor profiles).
 */

'use strict';

// Store cache on globalThis so it survives across warm invocations of the same Vercel container.
if (!globalThis._apiCache) {
  globalThis._apiCache = new Map();
}
const cache = globalThis._apiCache;

const MAX_CACHE_SIZE = 1000;

/**
 * Clean up expired items periodically or when cache grows large.
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expiresAt) {
      cache.delete(key);
    }
  }
}

/**
 * Get cached item by key. Returns null if missing or expired.
 * @param {string} key
 * @returns {any|null}
 */
function get(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

/**
 * Set item in cache with TTL in seconds.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds - Default: 10 seconds
 */
function set(key, value, ttlSeconds = 10) {
  if (cache.size > MAX_CACHE_SIZE) {
    cleanupExpired();
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate a key or clear keys starting with a prefix.
 * @param {string} keyOrPrefix
 */
function del(keyOrPrefix) {
  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache.
 */
function clear() {
  cache.clear();
}

module.exports = { get, set, del, clear };
