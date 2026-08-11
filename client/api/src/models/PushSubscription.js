/**
 * PushSubscription schema — stores Web Push endpoint + keys per user.
 *
 * A user can have multiple active subscriptions (phone + laptop + tablet).
 * Each subscription is identified by its endpoint URL which is unique per
 * browser/device combination. Duplicate registrations are handled by upsert.
 *
 * Documents are removed automatically 90 days after the last update so
 * stale subscriptions from uninstalled browsers don't accumulate.
 */

'use strict';

const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // The full PushSubscription object from the browser.
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },

    // Auto-expires 90 days after last update.
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
pushSubscriptionSchema.index({ user: 1 });
// Unique per endpoint so upsert doesn't create duplicates.
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = { PushSubscription };
