/**
 * Inventory schema — blood group stock levels per hospital.
 *
 * Each document represents one blood group's current stock at one hospital.
 * Keeping one document per (hospital, bloodGroup) pair makes atomic
 * increment/decrement safe and avoids update conflicts on the same array.
 *
 * Code Red broadcasts are stored separately on each inventory document so
 * the MongoDB TTL index can auto-expire them after ~6 hours without a cron.
 */

'use strict';

const mongoose = require('mongoose');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inventorySchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    bloodGroup: {
      type: String,
      enum: { values: BLOOD_GROUPS, message: 'Invalid blood group' },
      required: true,
    },

    // Units available (bags). A bag is typically 350–450 mL whole blood.
    units: {
      type: Number,
      min: [0, 'Units cannot be negative'],
      default: 0,
    },

    // Expiry date of the current stock batch. Hospitals update this manually.
    expiresAt: {
      type: Date,
    },

    // Low-stock threshold — admin configures per hospital/group.
    // A Code Red broadcast fires automatically when units drop to or below this.
    lowStockThreshold: {
      type: Number,
      default: 2,
      min: 0,
    },

    // Code Red broadcast metadata.  `broadcastExpiresAt` is the field the
    // TTL index watches: MongoDB deletes the subdoc (by nulling the field)
    // after 6 hours, but a partial TTL on a sub-field isn't supported — so we
    // track it here and let the route check it on read.
    codeRed: {
      active: { type: Boolean, default: false },
      message: { type: String, trim: true },
      issuedAt: { type: Date },
      expiresAt: { type: Date },   // 6 hours after issuedAt
    },

    // Source of the last update — 'manual' (dashboard) or 'api' (sync endpoint).
    lastUpdatedBy: {
      type: String,
      enum: ['manual', 'api'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to fast query batches per hospital & blood group.
inventorySchema.index({ hospital: 1, bloodGroup: 1 });

// Efficient queries: find all low-stock items across hospitals.
inventorySchema.index({ units: 1, bloodGroup: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);

// Safely drop legacy unique index from MongoDB collection if present
mongoose.connection.once('open', async () => {
  try {
    await Inventory.collection.dropIndex('hospital_1_bloodGroup_1');
  } catch (err) {
    // Index already dropped or doesn't exist
  }
});

module.exports = { Inventory, BLOOD_GROUPS };
