/**
 * DonationToken — Phase 7 (QR Check-in)
 *
 * A one-time, time-limited token that a Donor generates when they arrive at
 * a hospital to donate blood for an approved Request. The hospital or admin
 * scans the QR code (which encodes the verify URL) to mark the Request as
 * fulfilled and record the donation.
 *
 * Security notes:
 *  - Token is a 64-byte crypto-random hex string (128 hex chars) — unguessable.
 *  - Expires in 24 hours (TTL index on `expiresAt`).
 *  - `usedAt` is set on first use; subsequent scans are rejected.
 *  - One active token per request at a time (unique index on requestId).
 */

'use strict';

const mongoose = require('mongoose');
const crypto   = require('crypto');

const donationTokenSchema = new mongoose.Schema(
  {
    /* The approved blood request this token is for */
    requestId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Request',
      required: true,
      unique:   true,     // one active token per request
    },

    /* The donor who generated the token */
    donorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    /* Cryptographically random short token value (8-char uppercase hex, e.g. A7B9X2Y4) */
    token: {
      type:     String,
      required: true,
      unique:   true,
      default:  () => crypto.randomBytes(4).toString('hex').toUpperCase(),
    },

    /* Token expires 24 h after creation */
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index:   { expireAfterSeconds: 0 },   // MongoDB TTL auto-delete
    },

    /* Set when the token is scanned and used — prevents reuse */
    usedAt: {
      type:    Date,
      default: null,
    },

    /* Who scanned / verified the token (admin or hospital user) */
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { timestamps: true }
);

const DonationToken = mongoose.model('DonationToken', donationTokenSchema);

module.exports = { DonationToken };
