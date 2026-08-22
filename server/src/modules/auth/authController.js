/**
 * Auth Controller — Handles HTTP requests and responses for authentication endpoints.
 */

'use strict';

const authService = require('./authService');

class AuthController {
  async register(req, res, next) {
    try {
      const data = await authService.registerUser(req.body);
      return res.status(201).json({
        success: true,
        message: 'Account created. Please check your email to verify your address.',
        data,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message, code: err.code });
      }
      next(err);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      await authService.verifyEmail(req.body.token);
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const data = await authService.loginUser(email, password);
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message, code: err.code });
      }
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const data = await authService.refreshTokenPair(req.body.refreshToken);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logoutUser(req.body.refreshToken);
      return res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const email = await authService.forgotPassword(req.body.email);
      return res.status(200).json({
        success: true,
        message: `Password reset link sent to ${email}. Please check your inbox and spam folder.`,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      return res.status(200).json({
        success: true,
        message: 'Password updated successfully. You can now log in.',
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async contact(req, res, next) {
    try {
      await authService.submitContactInquiry(req.body);
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent to the BloodSync Support Team.',
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const data = await authService.getProfile(req.user.id);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async updateMe(req, res, next) {
    try {
      const data = await authService.updateProfile(req.user.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new AuthController();
