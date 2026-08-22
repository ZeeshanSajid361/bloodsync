/**
 * Auth Service — Handles all core authentication business logic & DB transactions.
 */

'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { User, ROLES } = require('#models/User');
const { DonorProfile } = require('#models/DonorProfile');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('#utils/token');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendContactSupportEmail } = require('#utils/email');

class AuthService {
  /**
   * Registers a new user account (donor or other roles)
   */
  async registerUser(userData) {
    const session = await mongoose.startSession();
    try {
      const { name, email, password, role, phone, city, age, gender, bloodGroup, lastDonationDate } = userData;

      if (!name || !email || !password || !role) {
        throw { status: 400, message: 'name, email, password, and role are all required.' };
      }
      if (!ROLES.includes(role)) {
        throw { status: 400, message: `role must be one of: ${ROLES.join(', ')}.` };
      }
      if (role === 'admin') {
        throw { status: 403, message: 'Admin accounts cannot be self-registered.' };
      }
      if (role === 'donor' && (!age || !gender || !bloodGroup)) {
        throw { status: 400, message: 'Donor registration requires age, gender, and bloodGroup.' };
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
            user: userId,
            age: Number(age),
            gender,
            bloodGroup,
            lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
          });
          await profile.save({ session });
        }
      });

      const user = await User.findById(userId);
      sendVerificationEmail({ name: user.name, email: user.email, token: rawToken }).catch((err) => {
        console.error('[email] Verification send failed:', err.message);
      });

      return { userId, role };
    } catch (err) {
      if (err.message === 'DUPLICATE_VERIFIED') {
        throw { status: 409, message: 'An account with this email already exists and is verified.' };
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Verifies user email via token
   */
  async verifyEmail(token) {
    if (!token) throw { status: 400, message: 'Verification token is required.' };

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw { status: 400, message: 'Verification link is invalid or has expired. Please request a new one.' };
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    sendWelcomeEmail({ name: user.name, email: user.email, role: user.role }).catch((err) => {
      console.error('[email] Welcome send failed:', err.message);
    });

    return true;
  }

  /**
   * Authenticates user and issues access/refresh tokens
   */
  async loginUser(email, password) {
    if (!email || !password) throw { status: 400, message: 'Email and password are required.' };

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password +refreshTokenHash').lean();

    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      throw { status: 401, message: 'Incorrect email or password.' };
    }
    if (!user.isEmailVerified) {
      throw { status: 403, message: 'Please verify your email address before logging in.', code: 'EMAIL_NOT_VERIFIED' };
    }
    if (user.isBlocked) {
      throw { status: 403, message: 'Your account has been suspended. Please contact support.', code: 'ACCOUNT_BLOCKED' };
    }

    const userIdStr = user._id.toString();
    const accessToken = signAccessToken({ id: userIdStr, role: user.role });
    const refreshToken = signRefreshToken({ id: userIdStr });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    User.updateOne({ _id: user._id }, { $set: { refreshTokenHash } }).catch((err) => {
      console.error('[auth] Background refresh token save error:', err.message);
    });

    return {
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
    };
  }

  /**
   * Refreshes access token via refresh token
   */
  async refreshTokenPair(refreshToken) {
    if (!refreshToken) throw { status: 400, message: 'Refresh token is required.' };

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw { status: 401, message: 'Invalid or expired refresh token. Please log in again.' };
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenHash').lean();
    const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (!user || user.refreshTokenHash !== incomingHash) {
      throw { status: 401, message: 'Refresh token mismatch. Please log in again.' };
    }

    const userIdStr = user._id.toString();
    const newAccessToken = signAccessToken({ id: userIdStr, role: user.role });
    const newRefreshToken = signRefreshToken({ id: userIdStr });

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    User.updateOne({ _id: user._id }, { $set: { refreshTokenHash: newHash } }).catch(() => {});

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logs user out by revoking refresh token
   */
  async logoutUser(refreshToken) {
    if (!refreshToken) return true;
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.sub).select('+refreshTokenHash');
      if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
      }
    } catch {
      // Intentionally ignore invalid token during logout
    }
    return true;
  }

  /**
   * Generates password reset link & emails user
   */
  async forgotPassword(email) {
    if (!email) throw { status: 400, message: 'Email address is required.' };
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      throw { status: 404, message: `No account found with email "${cleanEmail}". Please check your email or register.` };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashed;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail({ name: user.name, email: user.email, token: rawToken });
    return cleanEmail;
  }

  /**
   * Resets password using token
   */
  async resetPassword(token, password) {
    if (!token || !password) throw { status: 400, message: 'Token and new password are required.' };
    if (password.length < 8) throw { status: 400, message: 'Password must be at least 8 characters.' };

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password +passwordResetToken +passwordResetExpires +refreshTokenHash');

    if (!user) {
      throw { status: 400, message: 'Reset link is invalid or has expired. Please request a new one.' };
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash = undefined;
    await user.save();
    return true;
  }

  /**
   * Support contact inquiry
   */
  async submitContactInquiry({ name, email, message }) {
    if (!name || !email || !message) throw { status: 400, message: 'Name, email, and message are required.' };
    await sendContactSupportEmail({ name, email, message });
    return true;
  }

  /**
   * Fetch profile by ID
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: 'User not found.' };
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      city: user.city || '',
    };
  }

  /**
   * Update profile by ID
   */
  async updateProfile(userId, { name, phone, city }) {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: 'User not found.' };

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (city !== undefined) user.city = city.trim();

    await user.save();
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      city: user.city,
    };
  }
}

module.exports = new AuthService();
