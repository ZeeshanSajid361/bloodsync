/**
 * Environment configuration loader.
 *
 * Validates that every required variable is present at startup so the server
 * fails fast with a clear message rather than crashing later with a cryptic
 * "Cannot read property of undefined" deep inside a route handler.
 */

'use strict';

require('dotenv').config();

const REQUIRED = [
  'PORT',
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'CLIENT_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  const msg = `[config] Missing required environment variables: ${missing.join(', ')}\n` +
    'Copy server/.env.example to server/.env and fill in the values.';
  console.error(msg);
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },

  clientUrl: process.env.CLIENT_URL,

  cloudinary: {
    cloudName:  process.env.CLOUDINARY_CLOUD_NAME,
    apiKey:     process.env.CLOUDINARY_API_KEY,
    apiSecret:  process.env.CLOUDINARY_API_SECRET,
  },

  // VAPID keys for Web Push (Phase 6).
  vapid: {
    publicKey:  process.env.VAPID_PUBLIC_KEY  || null,
    privateKey: process.env.VAPID_PRIVATE_KEY || null,
    subject:    process.env.VAPID_SUBJECT     || 'mailto:admin@bloodsync.app',
  },
};
