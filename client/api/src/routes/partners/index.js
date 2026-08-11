/**
 * Partner Organisation routes — Drives, Camps, Assisted Requests, and Stats.
 */

'use strict';

const router = require('express').Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { Organization } = require('../../models/Organization');
const { Drive }        = require('../../models/Drive');
const { Request }      = require('../../models/Request');
const upload           = require('../../middleware/upload');
const { uploadBuffer } = require('../../utils/cloudinaryUpload');

async function requirePartnerOrg(req, res, next) {
  try {
    const userId = req.user.id || req.user._id;
    const org = await Organization.findOne({ owner: userId });
    if (!org) {
      return res.status(404).json({ success: false, message: 'No registered organisation found for this user.' });
    }
    req.org = org;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/partners/drives
 * List donation camps created by this partner.
 */
router.get('/drives', requireAuth, requireRole(['hospital', 'admin']), requirePartnerOrg, async (req, res, next) => {
  try {
    const drives = await Drive.find({ organizationId: req.org._id }).sort({ date: -1 });
    res.json({ success: true, data: drives });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/partners/drives
 * Create a new blood donation camp / drive.
 */
router.post('/drives', requireAuth, requireRole(['hospital', 'admin']), requirePartnerOrg, async (req, res, next) => {
  try {
    const { title, description, date, startTime, endTime, address, city, mapsUrl, latitude, longitude, targetBloodGroups, expectedTurnout } = req.body;
    if (!title || !date || !city) {
      return res.status(400).json({ success: false, message: 'Title, date, and city are required.' });
    }

    const drive = await Drive.create({
      organizationId: req.org._id,
      title,
      description,
      date,
      startTime: startTime || '09:00 AM',
      endTime: endTime || '05:00 PM',
      location: { address, city, mapsUrl, latitude, longitude },
      targetBloodGroups: Array.isArray(targetBloodGroups) ? targetBloodGroups : [],
      expectedTurnout: Number(expectedTurnout) || 50,
    });

    res.status(201).json({ success: true, message: 'Donation camp created successfully!', data: drive });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/partners/assisted-requests
 * List assisted requests created by this partner on behalf of elderly/rural seekers.
 */
router.get('/assisted-requests', requireAuth, requireRole(['hospital', 'admin']), requirePartnerOrg, async (req, res, next) => {
  try {
    const requests = await Request.find({ assistedByPartner: req.org._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/partners/assisted-requests
 * Create an assisted request on behalf of a patient.
 */
router.post(
  '/assisted-requests',
  requireAuth,
  requireRole(['hospital', 'admin']),
  requirePartnerOrg,
  upload.array('documents', 3),
  async (req, res, next) => {
    try {
      const { bloodGroup, unitsRequired, urgency, hospitalName, hospitalCity, hospitalAddress, patientName, additionalNotes, seekerPhone } = req.body;
      if (!bloodGroup || !unitsRequired || !hospitalCity || !hospitalName) {
        return res.status(400).json({ success: false, message: 'Blood group, units, hospital name, and city are required.' });
      }

      // Upload verification documents if attached
      const docUrls = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploaded = await uploadBuffer(file.buffer, { folder: 'bloodsync/requests' });
          docUrls.push(uploaded.secure_url);
        }
      }

      const request = await Request.create({
        seeker: req.user._id,
        assistedByPartner: req.org._id,
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        urgency: urgency || 'urgent',
        hospitalName,
        hospitalCity,
        hospitalAddress: hospitalAddress || '',
        patientName: patientName || 'Assisted Patient',
        additionalNotes: additionalNotes ? `[Assisted by ${req.org.name}] ${additionalNotes}` : `Assisted by ${req.org.name}`,
        documentUrls: docUrls,
        status: 'pending_review',
      });

      res.status(201).json({ success: true, message: 'Assisted blood request submitted for admin review!', data: request });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/partners/stats
 * Overview stats for Partner Organisation dashboard.
 */
router.get('/stats', requireAuth, requireRole(['hospital', 'admin']), requirePartnerOrg, async (req, res, next) => {
  try {
    const activeDrives = await Drive.countDocuments({ organizationId: req.org._id, status: { $in: ['upcoming', 'ongoing'] } });
    const completedDrives = await Drive.countDocuments({ organizationId: req.org._id, status: 'completed' });
    
    const drives = await Drive.find({ organizationId: req.org._id });
    const donorsMobilized = drives.reduce((acc, d) => acc + (d.rsvps ? d.rsvps.length : 0), 0);

    const assistedRequests = await Request.find({ assistedByPartner: req.org._id });
    const requestsFacilitated = assistedRequests.filter(r => r.status === 'fulfilled').length;
    const pendingAssistedRequests = assistedRequests.filter(r => r.status === 'pending_review' || r.status === 'approved').length;

    res.json({
      success: true,
      data: {
        activeDrives,
        completedDrives,
        donorsMobilized,
        requestsFacilitated,
        pendingAssistedRequests,
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
