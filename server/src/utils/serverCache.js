/**
 * Backend Node.js In-Memory Cache Engine (Layer 2 Server Cache)
 * 
 * Caches database queries & expensive API responses in Node.js RAM with TTL.
 * Implements the Cache-Aside pattern to reduce MongoDB load and deliver microsecond response times.
 */

class ServerCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Set cache entry
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttlSeconds 
   */
  set(key, data, ttlSeconds = 300) {
    if (!key || data === undefined) return;
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get cached entry or null if expired/missing
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    if (!key || !this.cache.has(key)) return null;
    const item = this.cache.get(key);
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  /**
   * Invalidate specific key or keys starting with a prefix
   * @param {string} prefix 
   */
  invalidatePrefix(prefix) {
    if (!prefix) return;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all server cache entries
   */
  clear() {
    this.cache.clear();
  }
}

export const serverCache = new ServerCache();
export default serverCache;
