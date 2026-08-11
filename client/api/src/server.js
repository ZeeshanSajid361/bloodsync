/**
 * Server entry point.
 *
 * Loads environment config and DB connection before starting the HTTP server.
 * Handles SIGTERM gracefully (required for Render's zero-downtime restarts).
 */

'use strict';

// Config must be required first — it calls dotenv.config() and validates vars.
const { port } = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

let server;

async function start() {
  await connectDB();

  server = app.listen(port, () => {
    console.log(`[server] BloodSync API listening on port ${port}`);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully.`);

  if (server) {
    server.close(() => {
      console.log('[server] HTTP server closed.');
      process.exit(0);
    });

    // Force-exit if something keeps the event loop alive after 10 seconds.
    setTimeout(() => {
      console.error('[server] Forceful shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
  // Let the process manager restart rather than continuing in an unknown state.
  process.exit(1);
});

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
