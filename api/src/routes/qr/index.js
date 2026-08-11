/**
 * QR Donation Check-in router — Phase 7
 *
 * Flow:
 *   1. Donor's blood request is approved by admin.
 *   2. Donor goes to the hospital and opens their BloodSync dashboard.
 *   3. Donor clicks "Generate QR" on their approved request — a one-time
 *      QR code is created, encoding the verify URL (valid for 24 h).
 *   4. Hospital staff (or admin) scans the QR code, which opens a browser
 *      page hitting GET /api/qr/verify/:token.
 *   5. The server validates the token, marks the request as 'fulfilled',
 *      records the donation, and fires notifications.
 *
 * Endpoints:
 *   POST /api/qr/generate         — Donor generates QR for an approved request
 *   GET  /api/qr/verify/:token    — Hospital/Admin scans to fulfill the request
 *   GET  /api/qr/:requestId       — Donor polls for token status (for dashboard UI)
 *   DELETE /api/qr/:requestId     — Donor cancels/regenerates a token
 */

'use strict';

const express        = require('express');
const QRCode         = require('qrcode');
const { DonationToken } = require('../../models/DonationToken');
const { Request }    = require('../../models/Request');
const { User }       = require('../../models/User');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { notifyUser } = require('../../utils/webPush');
const env            = require('../../config/env');

const router = express.Router();

/* ── helper ──────────────────────────────────────────────────────────────── */
const VERIFY_BASE_URL = env.clientUrl || 'http://localhost:5173';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/qr/generate
   Donor generates a QR code for one of their approved blood requests.
   Returns: { token, qrDataUrl, expiresAt, verifyUrl }
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/generate', requireAuth, requireRole(['donor']), async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId is required.' });
    }

    // Validate request exists and is approved
    const bloodRequest = await Request.findById(requestId);
    if (!bloodRequest) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }
    if (bloodRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `QR can only be generated for approved requests. Current status: ${bloodRequest.status}.`,
      });
    }

    // Remove any existing (possibly expired) token for this request
    await DonationToken.deleteOne({ requestId });

    // Create a new token
    const donationToken = await DonationToken.create({
      requestId,
      donorId: req.user.id,
    });

    // Build the verify URL that the scanner will open
    const verifyUrl = `${VERIFY_BASE_URL}/qr/verify/${donationToken.token}`;

    // Generate QR as a base64 data URL (so the frontend can render it directly)
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width:            300,
      margin:           2,
      color: {
        dark:  '#1a1a2e',
        light: '#ffffff',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        token:     donationToken.token,
        qrDataUrl,
        verifyUrl,
        expiresAt: donationToken.expiresAt,
      },
    });
  } catch (err) {
    console.error('[qr/generate]', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR code.' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/qr/verify/:token
   Hospital/Admin scans the QR code — validates token and fulfills the request.
   Returns: { request, donor (masked), message }
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/verify/:token', requireAuth, requireRole(['admin', 'hospital']), async (req, res) => {
  try {
    const donationToken = await DonationToken
      .findOne({ token: new RegExp('^' + req.params.token.trim() + '$', 'i') })
      .populate('requestId donorId');

    if (!donationToken) {
      return res.status(404).json({
        success: false,
        message: 'QR code is invalid or has expired. Ask the donor to regenerate it.',
      });
    }

    if (donationToken.usedAt) {
      return res.status(409).json({
        success: false,
        message: `This QR code was already used on ${new Date(donationToken.usedAt).toLocaleString('en-PK')}.`,
      });
    }

    if (new Date() > donationToken.expiresAt) {
      return res.status(410).json({
        success: false,
        message: 'This QR code has expired. Ask the donor to generate a new one.',
      });
    }

    const bloodRequest = donationToken.requestId; // populated
    const donor        = donationToken.donorId;   // populated

    if (bloodRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${bloodRequest.status}. This QR is no longer valid.`,
      });
    }

    // Hospital Location & Identity Verification:
    if (req.user && req.user.role === 'hospital') {
      const { Organization } = require('../../models/Organization');
      const hospitalOrg = await Organization.findOne({ owner: req.user.id }).lean();
      if (hospitalOrg) {
        const counterHospitalId = String(hospitalOrg._id || hospitalOrg.id || '');
        const requestHospitalId = String(bloodRequest.hospital || '');
        const counterHospitalName = (hospitalOrg.name || '').trim().toLowerCase();
        const requestHospitalName = (bloodRequest.hospitalName || '').trim().toLowerCase();

        const matchById = counterHospitalId && requestHospitalId && counterHospitalId === requestHospitalId;
        const matchByName = counterHospitalName && requestHospitalName && (
          counterHospitalName.includes(requestHospitalName) || requestHospitalName.includes(counterHospitalName)
        );

        if (!matchById && !matchByName) {
          return res.status(403).json({
            success: false,
            message: `Hospital Location Mismatch! This QR token is for a blood request at "${bloodRequest.hospitalName}" (${bloodRequest.hospitalCity || 'specified location'}). It cannot be verified or fulfilled at ${hospitalOrg.name}.`,
          });
        }
      }
    }

    // ── Mark token used ───────────────────────────────────────────────────
    donationToken.usedAt     = new Date();
    donationToken.verifiedBy = req.user.id;
    await donationToken.save();

    // ── Fulfill the request ───────────────────────────────────────────────
    bloodRequest.status      = 'fulfilled';
    bloodRequest.fulfilledAt = new Date();
    bloodRequest.fulfilledBy = donor._id;
    await bloodRequest.save();

    // ── Update donor donation count (for recognition level) ───────────────
    const { DonorProfile } = require('../../models/DonorProfile');
    await User.findByIdAndUpdate(donor._id, { $inc: { donationCount: 1 } });
    await DonorProfile.findOneAndUpdate(
      { user: donor._id },
      { $inc: { confirmedDonations: 1 }, lastDonationDate: new Date() },
      { upsert: true }
    );

    // ── Notify the seeker ─────────────────────────────────────────────────
    try {
      await notifyUser({
        userId:  bloodRequest.seeker,
        type:    'request_fulfilled',
        title:   '🩸 Your blood request has been fulfilled!',
        message: `A donor has arrived at ${bloodRequest.hospitalName} and your request for ${bloodRequest.patientBloodGroup} blood is now marked as fulfilled.`,
        link:    '/dashboard/seeker',
      });
    } catch (_) { /* non-fatal */ }

    // ── Notify the donor ──────────────────────────────────────────────────
    try {
      await notifyUser({
        userId:  donor._id,
        type:    'donation_confirmed',
        title:   '✅ Donation confirmed — thank you!',
        message: `Your donation for ${bloodRequest.patientBloodGroup} blood at ${bloodRequest.hospitalName} has been verified. Your recognition level has been updated!`,
        link:    '/dashboard/donor',
      });
    } catch (_) { /* non-fatal */ }

    res.json({
      success: true,
      message: 'Donation verified successfully! The request is now marked as fulfilled.',
      data: {
        requestId:     bloodRequest._id,
        bloodGroup:    bloodRequest.bloodGroup,
        hospitalName:  bloodRequest.hospitalName,
        donor: {
          name:       donor.name,
          bloodGroup: donor.bloodGroup,
          city:       donor.city,
        },
        fulfilledAt: bloodRequest.fulfilledAt,
      },
    });
  } catch (err) {
    console.error('[qr/verify]', err);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/qr/:requestId
   Donor polls for the status of the token for a given request.
   Used to check if the QR has been scanned.
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:requestId', requireAuth, requireRole(['donor']), async (req, res) => {
  try {
    const donationToken = await DonationToken.findOne({
      requestId: req.params.requestId,
      donorId:   req.user.id,
    });

    if (!donationToken) {
      return res.json({ success: true, data: null }); // no token generated yet
    }

    const verifyUrl  = `${VERIFY_BASE_URL}/qr/verify/${donationToken.token}`;
    const qrDataUrl  = donationToken.usedAt
      ? null
      : await QRCode.toDataURL(verifyUrl, {
          width: 300, margin: 2,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });

    res.json({
      success: true,
      data: {
        token:     donationToken.token,
        qrDataUrl,
        verifyUrl,
        expiresAt: donationToken.expiresAt,
        usedAt:    donationToken.usedAt,
        isUsed:    !!donationToken.usedAt,
        isExpired: new Date() > donationToken.expiresAt,
      },
    });
  } catch (err) {
    console.error('[qr/status]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch QR status.' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE /api/qr/:requestId
   Donor regenerates (cancels existing token so they can create a new one).
   ═══════════════════════════════════════════════════════════════════════════ */
router.delete('/:requestId', requireAuth, requireRole(['donor']), async (req, res) => {
  try {
    const deleted = await DonationToken.findOneAndDelete({
      requestId: req.params.requestId,
      donorId:   req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'No active QR token found for this request.' });
    }
    res.json({ success: true, message: 'QR token cancelled. You can generate a new one.' });
  } catch (err) {
    console.error('[qr/delete]', err);
    res.status(500).json({ success: false, message: 'Failed to cancel QR token.' });
  }
});

module.exports = router;
