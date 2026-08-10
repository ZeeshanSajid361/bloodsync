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
  // In serverless environments (Vercel) we warn but don't exit,
  // so OPTIONS preflight requests can still return 200.
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
}

const DEFAULT_MONGO = 'mongodb+srv://zeeshansajid361_db_user:sBULQ286fp6kdk2f@bloodlinkcluster.5eflvom.mongodb.net/?appName=BloodLinkCluster';
const DEFAULT_JWT_ACCESS = 'e0306a6aea70084660bc240d619abeb1ecf02ccc8c07c8ee205fc9f3cf1e68f5';
const DEFAULT_JWT_REFRESH = '9d54604607b14d4add072ca22bfc216e0ec78863667ae4ea09848d9aa4f390e7';

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || DEFAULT_MONGO,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || DEFAULT_JWT_ACCESS,
    refreshSecret: process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'zeeshansajid361@gmail.com',
    pass: process.env.SMTP_PASS || 'fbleyevcgjbtqeiq',
    from: process.env.EMAIL_FROM || 'BloodLink <zeeshansajid361@gmail.com>',
  },

  clientUrl: process.env.CLIENT_URL || 'https://blood-sync-app.vercel.app',

  cloudinary: {
    cloudName:  process.env.CLOUDINARY_CLOUD_NAME || 'wozquwrj',
    apiKey:     process.env.CLOUDINARY_API_KEY || '297953627941952',
    apiSecret:  process.env.CLOUDINARY_API_SECRET || 'ol2b-DaOvJilBdIcvZQ1Ze5EmiQ',
  },

  // VAPID keys for Web Push (Phase 6).
  vapid: {
    publicKey:  process.env.VAPID_PUBLIC_KEY  || 'BPBTY8mtHrMY_wvtKpE-KQcCOt-nreKYtedwRgDevqtq6R7WzYvOnfmBgjKyPFmZAOaSNcYQ9Ca1K6J8ELxUdAc',
    privateKey: process.env.VAPID_PRIVATE_KEY || 's3k_Mvt6XsoeTeq6ti5cLHu24-bRB8xrbTa4-cf1cdI',
    subject:    process.env.VAPID_SUBJECT     || 'mailto:zeeshansajid361@gmail.com',
  },
};
