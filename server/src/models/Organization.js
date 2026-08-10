/**
 * Organization schema.
 *
 * Covers both hospitals and partner organisations (university societies,
 * PRCS chapters, blood banks). The `type` field distinguishes them.
 * All registrations start with status 'pending' and are activated only
 * after admin review (Phase 5).
 *
 * The `apiKeyHash` field supports the forward-looking hospital inventory
 * sync endpoint (Phase 4). It is populated when an admin approves a hospital
 * registration and issues an API key.
 */

'use strict';

const mongoose = require('mongoose');

const ORG_TYPES = ['hospital', 'web_hospital', 'api_hospital', 'partner'];
const ORG_STATUS = ['pending', 'approved', 'rejected'];

const organizationSchema = new mongoose.Schema(
  {
    // The admin user account linked to this organisation.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: {
      type: String,
      required: [true, 'Organisation name is required'],
      trim: true,
    },

    type: {
      type: String,
      enum: { values: ORG_TYPES, message: 'Type must be web_hospital, api_hospital, hospital, or partner' },
      required: true,
    },

    status: {
      type: String,
      enum: { values: ORG_STATUS, message: 'Invalid status value' },
      default: 'pending',
    },

    // Proof of existence (PMC certificate, health board license, etc.)
    verificationDocumentUrls: [{
      type: String,
    }],
    verificationDocumentPublicIds: [{
      type: String,
    }],

    // Physical location — used for proximity-based donor matching in Phase 6.
    address: {
      street: String,
      city: { type: String, required: [true, 'City is required'] },
      province: String,
      mapsUrl: String,
      latitude: Number,
      longitude: Number,
    },

    // Coordinates cached from Nominatim (Phase 6); null until first geocode lookup.
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Hashed API key for inventory sync — raw key is shown once and never stored.
    apiKeyHash: {
      type: String,
      select: false,
    },

    // Admin notes on approval / rejection.
    adminNote: {
      type: String,
      trim: true,
    },

    // SECP / Charity registration number for Partner Organisations
    secpRegistrationNo: {
      type: String,
      trim: true,
    },

    // Timestamp of last automated API sync for EMN hospitals
    lastSyncedAt: Date,

    rejectedAt: Date,
    approvedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.apiKeyHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Geospatial index for proximity queries (Phase 6).
organizationSchema.index({ location: '2dsphere' }, { sparse: true });
organizationSchema.index({ status: 1, type: 1 });

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = { Organization, ORG_TYPES, ORG_STATUS };
