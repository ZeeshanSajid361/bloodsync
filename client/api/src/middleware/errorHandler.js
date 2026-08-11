/**
 * Centralised error handler — must be registered as the last middleware in
 * app.js so that any error thrown or passed to next() lands here.
 *
 * Mongoose validation errors and JWT errors are mapped to appropriate HTTP
 * status codes so the client never receives a raw 500 for a user mistake.
 */

'use strict';

const { nodeEnv } = require('../config/env');

/**
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred.';
  let errors = undefined;

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 422;
    const errList = Object.values(err.errors).map((e) => e.message);
    message = errList.length > 0 ? errList.join(' ') : 'Validation failed.';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ── Mongoose duplicate key (unique constraint violation) ──────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists.`;
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // ── Mongoose cast error (invalid ObjectId in URL params) ──────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}.`;
  }

  // Only include the stack trace in development to avoid leaking internals.
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(nodeEnv === 'development' && { stack: err.stack }),
  };

  // Log server errors so they appear in console/Render logs without exposing
  // them to the client.
  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json(response);
}

/**
 * Catches requests to routes that don't exist and converts them to a clean
 * 404 JSON response instead of Express's default HTML error page.
 *
 * @type {import('express').RequestHandler}
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFound };
