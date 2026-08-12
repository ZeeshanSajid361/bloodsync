/**
 * MongoDB connection management.
 *
 * Uses a module-level cached promise so calling connectDB() multiple times
 * (e.g. in tests, or in the Vercel serverless api/index.js on warm invocations)
 * never opens more than one physical connection.
 *
 * Pool settings are tuned for a free-tier Atlas M0 cluster running on Render:
 *   maxPoolSize 10  — handle concurrent requests without queuing
 *   minPoolSize 2   — keep 2 warm sockets alive between bursts
 *   socketTimeoutMS — detect dead sockets faster than Atlas's default
 */

'use strict';

const mongoose = require('mongoose');
const { mongoUri } = require('./env');

let connectionPromise = null;

const connectionOptions = {
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS:          45_000,
  maxPoolSize:              10,
  minPoolSize:              2,
  heartbeatFrequencyMS:     10_000,
};

async function connectDB() {
  // Already connected — reuse without re-connecting.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // In-flight connection promise — don't start a second one.
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(mongoUri, connectionOptions);

  mongoose.connection.on('connected', () => {
    console.log('[db] Connected to MongoDB Atlas');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] Connection error:', err.message);
    // Reset so the next call can attempt a fresh connection.
    connectionPromise = null;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Disconnected from MongoDB — will reconnect on next request');
    connectionPromise = null;
  });

  return connectionPromise;
}

module.exports = { connectDB };
