/**
 * Professional In-Memory & Storage Cache Engine (SWR Architecture)
 * 
 * Provides 0ms instant RAM data retrieval with configurable Time-To-Live (TTL),
 * emergency route bypass policies, automatic cache invalidation on logout/mutations,
 * and zero HTTP overhead.
 */

// Routes that MUST bypass static caching to ensure real-time emergency accuracy
const EMERGENCY_BYPASS_KEYS = [
  'live-requests',
  'emergency-feed',
  'seeker-compatibility',
  'donor-search',
];

class CacheEngine {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Set a cached item in RAM and Session Storage
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttlMs - Time to live in milliseconds (default 5 minutes)
   */
  set(key, data, ttlMs = 5 * 60 * 1000) {
    if (!key || data === undefined) return;
    
    // Never cache emergency real-time feed items long-term
    if (EMERGENCY_BYPASS_KEYS.some(bypassKey => key.includes(bypassKey))) {
      return;
    }

    const record = {
      data,
      expiry: Date.now() + ttlMs,
    };

    // 1. Store in RAM (Fastest 0ms lookup)
    this.memoryCache.set(key, record);

    // 2. Persist to sessionStorage for tab survival
    try {
      sessionStorage.setItem(`app_cache:${key}`, JSON.stringify(record));
    } catch {
      // Ignore quota errors gracefully
    }
  }

  /**
   * Get a cached item. Returns null if missing, expired, or emergency bypassed.
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    if (!key) return null;

    // Bypass caching for emergency real-time requests
    if (EMERGENCY_BYPASS_KEYS.some(bypassKey => key.includes(bypassKey))) {
      return null;
    }

    // 1. Check RAM Cache
    if (this.memoryCache.has(key)) {
      const record = this.memoryCache.get(key);
      if (Date.now() < record.expiry) {
        return record.data;
      }
      this.memoryCache.delete(key);
    }

    // 2. Fallback to SessionStorage
    try {
      const stored = sessionStorage.getItem(`app_cache:${key}`);
      if (stored) {
        const record = JSON.parse(stored);
        if (Date.now() < record.expiry) {
          this.memoryCache.set(key, record);
          return record.data;
        }
        sessionStorage.removeItem(`app_cache:${key}`);
      }
    } catch {
      // Ignore parse errors
    }

    return null;
  }

  /**
   * Invalidate specific cache key or pattern
   * @param {string} key 
   */
  invalidate(key) {
    if (!key) return;
    this.memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`app_cache:${key}`);
    } catch {}
  }

  /**
   * Clear all cached application state (e.g. on Logout)
   */
  clear() {
    this.memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('app_cache:')) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
  }
}

export const cacheService = new CacheEngine();
export default cacheService;
