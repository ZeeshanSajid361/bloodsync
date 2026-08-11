/**
 * DonorProfile schema.
 *
 * Stores all donor-specific fields that don't belong on the shared User
 * document. Linked 1-to-1 with User via the `user` field. Created
 * automatically when a donor completes registration.
 *
 * The eligibility engine lives in utils/eligibility.js and operates on
 * the `gender` and `lastDonationDate` fields here — nothing is cached as
 * a stale boolean, so the result is always current on every read.
 *
 * `confirmedDonations` is the integer that drives the recognition-level badge.
 * It is incremented by the admin/hospital "mark donation complete" action
 * (Phase 7), never by self-report.
 */

'use strict';

const mongoose = require('mongoose');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS      = ['male', 'female', 'other'];

const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // strictly one profile per user
    },

    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Donors must be at least 18 years old'],
      max: [65, 'Donors must be 65 years old or younger'],
    },

    gender: {
      type: String,
      enum: { values: GENDERS, message: 'Gender must be male, female, or other' },
      required: [true, 'Gender is required'],
    },

    bloodGroup: {
      type: String,
      enum: { values: BLOOD_GROUPS, message: 'Invalid blood group' },
      required: [true, 'Blood group is required'],
    },

    // Null means never donated — immediately eligible per the eligibility engine.
    lastDonationDate: {
      type: Date,
      default: null,
    },

    // Donor's self-declared availability.
    // A donor who is medically eligible but unavailable will NOT appear in
    // search results or Code Red alerts (Phase 6).
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Count of confirmed donations (incremented by admin/hospital in Phase 7).
    // Self-reported history is not counted here.
    confirmedDonations: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional bio / note shown on donor card.
    bio: {
      type: String,
      trim: true,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },

    // ── Anti-Abuse & Reliability Engine ──────────────────────────────────────
    cancelledPledges: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiredPledges: {
      type: Number,
      default: 0,
      min: 0,
    },
    recentPledgeCancelHistory: [
      {
        cancelledAt: { type: Date, default: Date.now },
        reason: { type: String, default: 'manual_cancel' },
      }
    ],
    pledgeSuspendedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Blood-group + availability + city are the three axes of the donor search
// query in Phase 3. City lives on the User document, so the compound index
// here covers the DonorProfile side.
donorProfileSchema.index({ bloodGroup: 1, isAvailable: 1 });
donorProfileSchema.index({ user: 1 }, { unique: true });

const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);

module.exports = { DonorProfile, BLOOD_GROUPS, GENDERS };
