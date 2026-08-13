/**
 * Express application factory.
 *
 * Wires security middleware, body parsers, request logging, and all route
 * modules together. The app instance is exported separately from server.js so
 * it can be imported directly by integration tests without binding to a port.
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const { clientUrl, nodeEnv } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRouter          = require('./routes/auth');
const donorRouter         = require('./routes/donors');
const seekerRouter        = require('./routes/seekers');
const hospitalRouter      = require('./routes/hospitals');
const adminRouter         = require('./routes/admin');
const notificationRouter  = require('./routes/notifications');
const qrRouter            = require('./routes/qr');
const docsRouter          = require('./routes/docs');
const partnerRouter       = require('./routes/partners');

const app = express();

// ── CORS must come BEFORE helmet and all other middleware ─────────────────────
// This ensures Access-Control-Allow-Origin is present on every response,
// including preflight OPTIONS requests from the Vercel serverless function.
const corsOptions = {
  origin: '*',
  credentials: false, // must be false when origin is '*'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // some browsers (IE11) choke on 204
};

// Handle preflight for ALL routes — must be before everything else.
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(compression());

// ── Security headers ──────────────────────────────────────────────────────────
// Disable crossOriginResourcePolicy so Vercel serverless assets are accessible.
app.use(helmet({ crossOriginResourcePolicy: false }));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── HTTP request logging ──────────────────────────────────────────────────────
// 'dev' format in development (coloured), 'combined' in production for log
// aggregators (Render, etc.).
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Response timing header ────────────────────────────────────────────────────
// Adds X-Response-Time to every response so Render logs show per-request
// latency — useful for identifying slow DB queries after migration.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    res.setHeader('X-Response-Time', `${ms}ms`);
    if (nodeEnv === 'production' && ms > 1000) {
      console.warn(`[perf] SLOW ${req.method} ${req.path} — ${ms}ms`);
    }
  });
  next();
});

// ── Global rate limits ────────────────────────────────────────────────────────
// A permissive global limiter that guards against bulk scraping. Sensitive
// routes (login, register, resend-verification) get tighter limits below.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 auth attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please wait and try again.' },
});

// Skip rate limiting for OPTIONS preflight requests.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return globalLimiter(req, res, next);
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get(['/api/health', '/health'], (_req, res) => {
  res.status(200).json({ success: true, message: 'BloodSync API is running.' });
});

// ── API routes ────────────────────────────────────────────────────────────────
// Skip auth rate limiter for OPTIONS preflight on auth routes.
app.use(['/api/auth', '/auth'], (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return authLimiter(req, res, next);
}, authRouter);
app.use(['/api/donors', '/donors'],         donorRouter);
app.use(['/api/seekers', '/seekers'],        seekerRouter);
app.use(['/api/hospitals', '/hospitals'],      hospitalRouter);
app.use(['/api/admin', '/admin'],          adminRouter);
app.use(['/api/notifications', '/notifications'],  notificationRouter);
app.use(['/api/qr', '/qr'],             qrRouter);
app.use(['/api/docs', '/docs'],           docsRouter);
app.use(['/api/partners', '/partners'],       partnerRouter);

// ── 404 and error handling ────────────────────────────────────────────────────
// Order matters: notFound must come before errorHandler.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
