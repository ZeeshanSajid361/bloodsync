/**
 * Request schema.
 *
 * Represents a blood request submitted by a seeker. The request goes through
 * a review lifecycle managed by admin (Phase 5):
 *
 *   pending_review → approved → fulfilled
 *                 ↘ rejected
 *                            ↘ cancelled (seeker-initiated)
 *
 * Document verification:
 *   The seeker uploads a photo of the hospital-issued blood request slip
 *   (and optionally a CNIC) via Cloudinary. The admin reviews these before
 *   moving the request to 'approved', at which point donor notifications fire
 *   (Phase 6). This mirrors how real platforms (Blood Link Pakistan, E Blood)
 *   handle verification without hospital API access.
 *
 * Anonymous routing:
 *   Donors who respond see only the hospital's address/phone, never the
 *   seeker's personal details. Seekers see only their request status and any
 *   admin note, never the responding donor's identity.
 */

'use strict';

const mongoose = require('mongoose');

const REQUEST_STATUS = ['pending_review', 'approved', 'rejected', 'fulfilled', 'cancelled'];
const BLOOD_GROUPS   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['routine', 'urgent', 'critical'];

const requestSchema = new mongoose.Schema(
  {
    // ── Parties ───────────────────────────────────────────────────────────────
    seeker: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Hospital is stored as an ObjectId ref when the hospital is a verified
    // Organization in the DB. Until Phase 4 fully seeds hospitals, it is
    // also accepted as a plain text name for flexibility.
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Organization',
    },

    hospitalName: {
      type:     String,
      trim:     true,
      required: [true, 'Hospital name is required'],
    },

    hospitalCity: {
      type:  String,
      trim:  true,
    },

    hospitalAddress: {
      type:  String,
      trim:  true,
    },

    latitude: {
      type: Number,
    },

    longitude: {
      type: Number,
    },

    mapsUrl: {
      type: String,
      trim: true,
    },

    // ── Medical details ───────────────────────────────────────────────────────
    patientBloodGroup: {
      type:     String,
      enum:     { values: BLOOD_GROUPS, message: 'Invalid blood group' },
      required: [true, 'Patient blood group is required'],
    },

    unitsNeeded: {
      type:    Number,
      default: 1,
      min:     [1, 'At least 1 unit is required'],
      max:     [10, 'Maximum 10 units per request'],
    },

    urgency: {
      type:    String,
      enum:    { values: URGENCY_LEVELS, message: 'Urgency must be routine, urgent, or critical' },
      default: 'routine',
    },

    patientName: {
      type:  String,
      trim:  true,
    },

    additionalNotes: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },

    // ── Document verification ─────────────────────────────────────────────────
    // URL to the hospital-issued blood request slip uploaded to Cloudinary.
    documentUrls: {
      type:     [String],
      validate: {
        validator: function(v) {
          if (['approved', 'fulfilled', 'cancelled'].includes(this.status)) return true;
          return (v && v.length > 0) || Boolean(this.documentUrl);
        },
        message: 'At least one hospital blood request slip is required for verification'
      }
    },

    documentPublicIds: {
      type:   [String],
      select: false, // only fetched when admin needs to delete it
    },

    // ── Request lifecycle ─────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    { values: REQUEST_STATUS, message: 'Invalid status value' },
      default: 'pending_review',
    },

    adminNote: {
      type:  String,
      trim:  true,
    },

    assistedByPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Organization',
    },

    fulfilledVia: {
      type: String,
      enum: ['api', 'manual'],
      default: 'manual',
    },

    reviewedAt: Date,
    fulfilledAt: Date,
    cancelledAt: Date,

    // Active donor commitments ("I'm On My Way") to prevent race conditions
    commitments: [
      {
        donor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reservedAt: { type: Date, default: Date.now },
        expiresAt:  { type: Date, required: true },
        etaMinutes: { type: Number, default: 45 },
        status:     { type: String, enum: ['en_route', 'completed', 'cancelled', 'expired'], default: 'en_route' },
      }
    ],
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.documentPublicId;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Admin pending queue and seeker's own request list are the two primary queries.
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ seeker: 1, createdAt: -1 });
requestSchema.index({ patientBloodGroup: 1, status: 1 });

const Request = mongoose.model('Request', requestSchema);

module.exports = { Request, REQUEST_STATUS, BLOOD_GROUPS, URGENCY_LEVELS };
