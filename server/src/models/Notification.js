/**
 * Notification schema — in-app guaranteed-delivery fallback.
 *
 * Every push notification also writes a Notification document so that users
 * who miss the push (browser closed, push blocked) can still see pending
 * alerts in their in-app bell on next visit.
 *
 * Lifecycle:
 *   created (isRead: false) → read (isRead: true)
 *   TTL index auto-deletes documents 30 days after creation.
 */

'use strict';

const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'request_approved',       // seeker's request was approved
  'request_rejected',       // seeker's request was rejected
  'request_fulfilled',      // seeker's request is fulfilled
  'donor_en_route',         // donor pledged I'm On My Way
  'donor_cancelled_pledge', // donor cancelled travel pledge
  'code_red',               // hospital issued a Code Red for a compatible blood group
  'donor_needed',           // compatible donor alert (Phase 6 push)
  'system',                 // generic platform message
];

const notificationSchema = new mongoose.Schema(
  {
    // Recipient user — every notification targets exactly one user.
    recipient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    type: {
      type:     String,
      enum:     { values: NOTIFICATION_TYPES, message: 'Unknown notification type' },
      required: true,
    },

    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Optional deep-link so the bell item is clickable.
    link: { type: String, trim: true },

    // Optional direct Google Maps link for medical facility location
    mapsUrl: { type: String, trim: true },

    isRead: { type: Boolean, default: false },

    // TTL — MongoDB removes the document 30 days after creation.
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) { delete ret.__v; return ret; },
    },
  }
);

// TTL index on expiresAt — auto-deletes old notifications.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast queries: unread count + bell list for a user.
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };
