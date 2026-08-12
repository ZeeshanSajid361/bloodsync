'use strict';

// Hoist imports to top level so Node.js loads them during serverless container init,
// avoiding per-request module resolution overhead on warm invocations.
const { connectDB } = require('../src/config/db');
const app           = require('../src/app');

module.exports = async (req, res) => {
  // Handle OPTIONS preflight IMMEDIATELY before loading DB or app router.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Return instant 200 OK for health check while triggering background DB pre-warm
    if (req.url === '/api/health' || req.url === '/health') {
      connectDB().catch(() => {});
      return app(req, res);
    }

    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('[serverless] Fatal error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

