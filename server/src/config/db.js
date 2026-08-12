/**
 * MongoDB connection management — optimised for Vercel serverless.
 *
 * KEY INSIGHT: In Vercel serverless, each function instance is isolated but
 * the Node.js process is reused across warm invocations of the SAME instance.
 * globalThis persists across warm invocations; module-level variables may be
 * re-evaluated. We therefore cache on globalThis.
 *
 * Pool settings tuned for serverless (NOT persistent server):
 *   maxPoolSize  2   — each Vercel instance holds max 2 sockets.
 *                      Atlas M0 limit = 500 connections total.
 *                      With many concurrent cold-start invocations, a high
 *                      pool (e.g. 10) instantly exhausts Atlas limits.
 *   minPoolSize  0   — don't keep idle sockets open between requests.
 *   bufferCommands   — false: queries fail immediately if not connected
 *                      instead of silently queuing and timing out later.
 *   serverSelectionTimeoutMS 5000 — fail fast on cold start Atlas handshake.
 */

'use strict';

const mongoose = require('mongoose');
const { mongoUri } = require('./env');

// ── Global connection cache ───────────────────────────────────────────────────
// Using globalThis so it survives module re-evaluations within the same
// Vercel function instance (warm reuse).
if (!globalThis._mongoCache) {
  globalThis._mongoCache = { conn: null, promise: null };
}
const cache = globalThis._mongoCache;

const CONNECTION_OPTIONS = {
  bufferCommands:           false,   // fail-fast — don't queue ops while connecting
  serverSelectionTimeoutMS: 5_000,   // fail quickly on Atlas cold-connect (was 10s)
  socketTimeoutMS:          30_000,
  maxPoolSize:              2,       // ← critical for serverless: keep low
  minPoolSize:              0,       // don't keep sockets idle between requests
  maxIdleTimeMS:            60_000,  // close idle sockets after 60s
};

async function connectDB() {
  // Healthy existing connection — reuse immediately (hot path).
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  // Connection attempt already in-flight — wait for it.
  if (cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }

  // Cold start — open a new connection.
  console.log('[db] Opening new MongoDB connection…');
  cache.promise = mongoose.connect(mongoUri, CONNECTION_OPTIONS).then((m) => m.connection);

  try {
    cache.conn = await cache.promise;
    console.log('[db] Connected to MongoDB Atlas');
  } catch (err) {
    // Reset so the next invocation can retry.
    cache.promise = null;
    cache.conn    = null;
    throw err;
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] Connection error:', err.message);
    cache.promise = null;
    cache.conn    = null;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Disconnected — cache cleared for next request');
    cache.promise = null;
    cache.conn    = null;
  });

  return cache.conn;
}

module.exports = { connectDB };
