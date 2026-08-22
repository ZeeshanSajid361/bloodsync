/**
 * Hybrid Multi-Layer Server Cache Engine (Supports Redis + Local Node RAM)
 * 
 * Works seamlessly across both traditional Express servers (Render/VPS) and Vercel Serverless Functions.
 * Automatically utilizes Upstash Redis / Redis Cloud if REDIS_URL or UPSTASH_REDIS_REST_URL is configured,
 * falling back gracefully to fast in-memory caching.
 */

'use strict';

class ServerCacheEngine {
  constructor() {
    this.memoryCache = new Map();
    this.redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || null;
  }

  /**
   * Set cache entry with TTL
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttlSeconds 
   */
  async set(key, data, ttlSeconds = 120) {
    if (!key || data === undefined) return;

    // 1. If Redis / Upstash URL is configured (Vercel Serverless environment)
    if (this.redisUrl) {
      try {
        const fetch = globalThis.fetch || (await import('node-fetch')).default;
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
          await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/setex/${encodeURIComponent(key)}/${ttlSeconds}`, {
            headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
            body: JSON.stringify(data),
            method: 'POST',
          });
          return;
        }
      } catch (err) {
        console.warn('[serverCache] Redis set fallback to memory:', err.message);
      }
    }

    // 2. In-memory Node RAM fallback (Render / VPS / Local Dev)
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.memoryCache.set(key, { data, expiry });
  }

  /**
   * Get cached entry
   * @param {string} key 
   * @returns {Promise<any|null>}
   */
  async get(key) {
    if (!key) return null;

    // 1. Check Redis / Upstash if configured
    if (this.redisUrl && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const fetch = globalThis.fetch || (await import('node-fetch')).default;
        const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.result) {
            return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
          }
        }
      } catch (err) {
        console.warn('[serverCache] Redis get fallback to memory:', err.message);
      }
    }

    // 2. Check In-Memory Cache
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (Date.now() > item.expiry) {
        this.memoryCache.delete(key);
        return null;
      }
      return item.data;
    }

    return null;
  }

  /**
   * Invalidate specific key or keys starting with a prefix
   * @param {string} prefix 
   */
  async invalidatePrefix(prefix) {
    if (!prefix) return;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  clear() {
    this.memoryCache.clear();
  }
}

const serverCache = new ServerCacheEngine();

module.exports = { serverCache, ServerCacheEngine };
