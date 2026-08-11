'use strict';

// Handle OPTIONS preflight IMMEDIATELY before loading anything else.
module.exports = async (req, res) => {
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
    const { connectDB } = require('./src/config/db');
    const app = require('./src/app');
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('[serverless] Fatal error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal serverless error',
      error: err.message,
      stack: err.stack,
    });
  }
};
