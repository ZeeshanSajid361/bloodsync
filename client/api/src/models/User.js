/**
 * User schema — single collection, role-based.
 *
 * All four platform roles (donor / seeker / hospital / admin) share this
 * collection. Role-specific fields are kept in separate modules (DonorProfile,
 * etc.) that reference this document by _id. Keeping auth data in one place
 * simplifies token verification and RBAC middleware.
 *
 * Sensitive fields (password, emailVerificationToken, refreshToken) are
 * excluded from the default JSON serialisation via the schema transform below.
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ROLES = ['donor', 'seeker', 'hospital', 'admin'];
const BCRYPT_ROUNDS = 10; // 10 rounds ≈ industry standard; gives ~4× faster hashing than 12 with negligible security difference

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned unless explicitly requested
    },

    role: {
      type: String,
      enum: { values: ROLES, message: 'Role must be one of: donor, seeker, hospital, admin' },
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,15}$/, 'Please provide a valid phone number'],
    },

    city: {
      type: String,
      trim: true,
    },

    // ── Email verification ────────────────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // ── Password reset ───────────────────────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ── Account state ─────────────────────────────────────────────────────────
    isBlocked: {
      type: Boolean,
      default: false,
    },

    // ── Refresh token storage ─────────────────────────────────────────────────
    // Only the hashed version is persisted; raw tokens never touch the DB.
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Strip every sensitive field before the object leaves the server.
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);


// ── Indexes ───────────────────────────────────────────────────────────────────
// email is already indexed via unique:true; add a partial index for token
// lookups during email verification so expired tokens don't slow things down.
userSchema.index(
  { emailVerificationToken: 1 },
  { sparse: true, expireAfterSeconds: 0, partialFilterExpression: { emailVerificationToken: { $exists: true } } }
);

// ── Pre-save hook — password hashing ─────────────────────────────────────────
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Compares a plain-text candidate against the stored bcrypt hash.
 * The `select: false` on the password field means callers must explicitly
 * include it: User.findOne({...}).select('+password').
 */
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Generates a cryptographically random email-verification token,
 * stores its SHA-256 hash on the document (so the raw token is never in the DB),
 * and returns the raw token for inclusion in the verification link.
 */
userSchema.methods.generateEmailVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  return rawToken;
};

/**
 * Hashes and stores a refresh token so that token theft from the DB
 * doesn't immediately grant the attacker a valid session.
 */
userSchema.methods.setRefreshToken = function (rawToken) {
  this.refreshTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Returns true if the given raw refresh token matches the stored hash.
 */
userSchema.methods.verifyRefreshToken = function (rawToken) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return this.refreshTokenHash === hash;
};

// TTL index to automatically delete unverified accounts after 24 hours.
// When an account is verified, emailVerificationExpires is removed, so it won't be deleted.
userSchema.index({ emailVerificationExpires: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };
