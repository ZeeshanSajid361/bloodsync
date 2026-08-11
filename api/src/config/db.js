/**
 * MongoDB connection management.
 *
 * Uses a module-level cached promise so that calling connectDB() multiple
 * times (e.g. in tests) never opens more than one physical connection.
 */

'use strict';

const mongoose = require('mongoose');
const { mongoUri } = require('./env');

let connectionPromise = null;

async function connectDB() {
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(mongoUri, {
    // Mongoose 7+ sets these defaults internally, but being explicit
    // makes the intent obvious and guards against future version changes.
    serverSelectionTimeoutMS: 10_000,
  });

  mongoose.connection.on('connected', () => {
    console.log('[db] Connected to MongoDB Atlas');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Disconnected from MongoDB');
  });

  return connectionPromise;
}

module.exports = { connectDB };
