/**
 * Auth routes — register, verify-email, login, refresh, logout, forgot-password, reset-password, contact, me.
 *
 * Direct relative imports for 100% Vercel serverless compatibility.
 */

'use strict';

const express = require('express');
const crypto  = require('crypto');
const mongoose = require('mongoose');
const bcrypt  = require('bcryptjs');

const { User, ROLES }         = require('../../models/User');
const { DonorProfile }        = require('../../models/DonorProfile');
const { requireAuth }          = require('../../middleware/auth');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/token');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendContactSupportEmail } = require('../../utils/email');

const router = express.Router();

// ── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      name, email, password, role,
      phone, city,
      age, gender, bloodGroup, lastDonationDate,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, and role are all required.',
      });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${ROLES.join(', ')}.`,
      });
    }

    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be self-registered.',
      });
    }

    if (role === 'donor' && (!age || !gender || !bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Donor registration requires age, gender, and bloodGroup.',
      });
    }

    let userId;
    let rawToken;

    await session.withTransaction(async () => {
      const existing = await User.findOne({ email });
      if (existing) {
        if (existing.isEmailVerified) {
          throw new Error('DUPLICATE_VERIFIED');
        } else {
          await User.deleteOne({ _id: existing._id }, { session });
          if (existing.role === 'donor') {
            await DonorProfile.deleteOne({ user: existing._id }, { session });
          }
        }
      }

      const user = new User({ name, email, password, role, phone, city });
      rawToken = user.generateEmailVerificationToken();
      await user.save({ session });
      userId = user._id;

      if (role === 'donor') {
        const profile = new DonorProfile({
          user:             userId,
          age:              Number(age),
          gender,
          bloodGroup,
          lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
        });
        await profile.save({ session });
      }
    });

    const user = await User.findById(userId);
    try {
      await sendVerificationEmail({ name: user.name, email: user.email, token: rawToken });
    } catch (err) {
      console.error('[email] Verification send failed:', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your address.',
      data: { userId, role },
    });
  } catch (err) {
    if (err.message === 'DUPLICATE_VERIFIED') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists and is verified.',
      });
    }
    next(err);
  } finally {
    session.endSession();
  }
});

// ── POST /api/auth/verify-email ─────────────────────────────────────────────
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired. Please request a new one.',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    try {
      await sendWelcomeEmail({ name: user.name, email: user.email, role: user.role });
    } catch (err) {
      console.error('[email] Welcome send failed:', err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/resend-verification ──────────────────────────────────────
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: `No account found with email "${cleanEmail}".` });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'This email is already verified. You can sign in.' });
    }

    const rawToken = user.generateEmailVerificationToken();
    await user.save();

    try {
      await sendVerificationEmail({ name: user.name, email: user.email, token: rawToken });
    } catch (err) {
      console.error('[email] Resend verification failed:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to dispatch verification email: ${err.message || 'SMTP error'}.`,
      });
    }

    return res.json({
      success: true,
      message: 'A fresh 2-hour verification link has been sent to your email.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail }).select('+password +refreshTokenHash').lean();

    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password.',
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_BLOCKED',
      });
    }

    const userIdStr = user._id.toString();
    const accessToken = signAccessToken({ id: userIdStr, role: user.role });
    const refreshToken = signRefreshToken({ id: userIdStr });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    User.updateOne({ _id: user._id }, { $set: { refreshTokenHash } }).catch((err) => {
      console.error('[auth] Background refresh token save error:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          city: user.city || '',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenHash').lean();

    const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (!user || user.refreshTokenHash !== incomingHash) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token mismatch. Please log in again.',
      });
    }

    const userIdStr = user._id.toString();
    const newAccessToken = signAccessToken({ id: userIdStr, role: user.role });
    const newRefreshToken = signRefreshToken({ id: userIdStr });

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    User.updateOne({ _id: user._id }, { $set: { refreshTokenHash: newHash } }).catch((err) => {
      console.error('[auth] Background refresh token update error:', err.message);
    });

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(200).json({ success: true, message: 'Logged out.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(200).json({ success: true, message: 'Logged out.' });
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenHash');
    if (user) {
      user.refreshTokenHash = undefined;
      await user.save();
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No account found with email "${cleanEmail}". Please check your email or register.`,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken   = hashed;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await sendPasswordResetEmail({ name: user.name, email: user.email, token: rawToken });
    } catch (err) {
      console.error('[email] Password reset send failed:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to dispatch reset email: ${err.message || 'SMTP service error'}. Please try again later.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Password reset link sent to ${cleanEmail}. Please check your inbox and spam folder.`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/reset-password ──────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password +passwordResetToken +passwordResetExpires +refreshTokenHash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash     = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/contact ──────────────────────────────────────────────────
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    await sendContactSupportEmail({ name, email, message });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent to the BloodSync Support Team.',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({
      success: true,
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone || '',
        city:  user.city || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/me ────────────────────────────────────────────────────────
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, phone, city } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name)  user.name  = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (city  !== undefined) user.city  = city.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone,
        city:  user.city,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
