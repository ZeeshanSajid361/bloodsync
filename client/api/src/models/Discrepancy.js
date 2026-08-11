/**
 * Discrepancy schema — Inventory discrepancy reports submitted by EMN hospital staff for admin review.
 */

'use strict';

const mongoose = require('mongoose');

const discrepancySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
    },
    bloodGroup: {
      type: String,
      required: true,
    },
    reportedUnits: {
      type: Number,
      required: true,
    },
    expectedUnits: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

const Discrepancy = mongoose.model('Discrepancy', discrepancySchema);

module.exports = { Discrepancy };
