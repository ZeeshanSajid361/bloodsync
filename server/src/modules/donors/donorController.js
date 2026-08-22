/**
 * Donor Controller — Handles HTTP req/res parsing for donor operations.
 */

'use strict';

const donorService = require('./donorService');

class DonorController {
  async getMe(req, res, next) {
    try {
      const data = await donorService.getMyProfile(req.user.id);
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
      const data = await donorService.updateMyProfile(req.user.id, req.body);
      return res.status(200).json({ success: true, message: 'Profile updated successfully.', data });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async toggleAvailability(req, res, next) {
    try {
      const data = await donorService.toggleAvailability(req.user.id, req.body.isAvailable);
      return res.status(200).json({
        success: true,
        message: `You are now marked as ${data.isAvailable ? 'available' : 'unavailable'}.`,
        data,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async searchDonors(req, res, next) {
    try {
      const data = await donorService.searchDonors(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getRequests(req, res, next) {
    try {
      const data = await donorService.getDonorRequests(req.user.id);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async commitToRequest(req, res, next) {
    try {
      const data = await donorService.commitToRequest(req.user.id, req.params.id, req.body.etaMinutes);
      return res.status(200).json({ success: true, message: 'Slot reserved! You are marked as en route.', data });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async cancelCommitment(req, res, next) {
    try {
      await donorService.cancelCommitment(req.user.id, req.params.id);
      return res.status(200).json({ success: true, message: 'Commitment cancelled. Slot freed.' });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new DonorController();
