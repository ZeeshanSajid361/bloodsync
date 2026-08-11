/**
 * Seeker routes.
 *
 * Routes:
 *   GET  /api/seekers/search         — search compatible donors (no auth required
 *                                      so unregistered users can preview results,
 *                                      but results are anonymised regardless)
 *   POST /api/seekers/requests        — submit a blood request with document upload
 *   GET  /api/seekers/requests/mine   — seeker's own request history + status
 *   DELETE /api/seekers/requests/:id  — cancel a pending_review request
 *
 * Document verification flow:
 *   1. Seeker submits the form with a photo of the hospital-issued blood slip.
 *   2. Multer receives the file buffer from memoryStorage.
 *   3. Buffer is piped to Cloudinary via uploadBuffer(); the returned secure_url
 *      is stored on the Request document.
 *   4. Request is created with status 'pending_review'.
 *   5. Admin reviews in Phase 5 and moves to 'approved' / 'rejected'.
 *
 * Anonymous routing:
 *   The GET /search endpoint returns donor city and level only — no names,
 *   emails, or phone numbers are ever exposed to the seeker.
 */

'use strict';

const express = require('express');

const { Request }                              = require('../../models/Request');
const { DonorProfile }                         = require('../../models/DonorProfile');
const { User }                                 = require('../../models/User');
const { requireAuth, requireRole }             = require('../../middleware/auth');
const upload                                   = require('../../middleware/upload');
const { uploadBuffer }                         = require('../../utils/cloudinaryUpload');
const { getCompatibleDonorGroups,
        getCompatibilitySummary,
        ALL_BLOOD_GROUPS }                     = require('../../utils/compatibility');
const { getEligibility }                       = require('../../utils/eligibility');
const { getDonorLevel }                        = require('../../utils/donorLevels');

const router = express.Router();

// ── GET /api/seekers/search ───────────────────────────────────────────────────
/**
 * Searches for available, eligible donors whose blood group is compatible with
 * the given patient blood group. Optionally filters by city.
 *
 * This endpoint is intentionally public (no requireAuth) so unauthenticated
 * seekers can preview the donor landscape before signing up. Results are
 * fully anonymised regardless.
 *
 * Query params:
 *   patientBloodGroup (required) — the patient's blood group
 *   city              (optional) — filter by donor city
 *   page, limit       (optional) — pagination
 */
router.get('/search', async (req, res, next) => {
  try {
    const { patientBloodGroup, city, page = 1, limit = 20 } = req.query;

    if (!patientBloodGroup || !ALL_BLOOD_GROUPS.includes(patientBloodGroup)) {
      return res.status(400).json({
        success: false,
        message: `patientBloodGroup is required and must be one of: ${ALL_BLOOD_GROUPS.join(', ')}.`,
      });
    }

    const compatibleGroups = getCompatibleDonorGroups(patientBloodGroup);
    const summary          = getCompatibilitySummary(patientBloodGroup);

    const pageNum  = Math.max(parseInt(page,  10), 1);
    const limitNum = Math.min(parseInt(limit, 10), 50);
    const skip     = (pageNum - 1) * limitNum;

    const { Inventory } = require('../../models/Inventory');

    const now = new Date();

    // Query unexpired hospital stock for compatible blood groups
    const rawInventory = await Inventory.find({
      bloodGroup: { $in: compatibleGroups },
      units: { $gt: 0 },
    })
      .populate('hospital', 'name address phone email status')
      .lean();

    // Filter valid, approved, unexpired batches
    const validBatches = rawInventory.filter((inv) => {
      if (!inv.hospital || inv.hospital.status !== 'approved') return false;
      if (inv.expiresAt && new Date(inv.expiresAt) < now) return false; // Filter out expired batches!
      if (city && inv.hospital.address?.city?.toLowerCase() !== city.toLowerCase()) return false;
      return true;
    });

    // Group batches by (hospitalId + bloodGroup) to sum total available units
    const groupedMap = new Map();
    for (const inv of validBatches) {
      const key = `${inv.hospital._id}_${inv.bloodGroup}`;
      if (!groupedMap.has(key)) {
        const addr = inv.hospital.address;
        const addressText = addr
          ? [addr.street, addr.city, addr.province].filter(Boolean).join(', ')
          : 'City Location';

        groupedMap.set(key, {
          inventoryId:  inv._id,
          hospitalId:   inv.hospital._id,
          hospitalName: inv.hospital.name || 'Hospital Blood Bank',
          address:      addressText,
          mapsUrl:      addr?.mapsUrl || null,
          city:         addr?.city || 'Unknown',
          phone:        inv.hospital.phone || 'Available at Counter',
          email:        inv.hospital.email || '',
          bloodGroup:   inv.bloodGroup,
          units:        0,
          expiresAt:    inv.expiresAt || null,
          codeRed:      false,
        });
      }

      const item = groupedMap.get(key);
      item.units += inv.units;
      if (inv.codeRed?.active) item.codeRed = true;
      if (inv.expiresAt && (!item.expiresAt || new Date(inv.expiresAt) < new Date(item.expiresAt))) {
        item.expiresAt = inv.expiresAt;
      }
    }

    const hospitalStock = Array.from(groupedMap.values());

    // Pull all availability-matching profiles; eligibility is time-based so
    // it must be computed in JS after the DB query.
    const profiles = await DonorProfile.find({
      bloodGroup:  { $in: compatibleGroups },
      isAvailable: true,
    })
      .populate('user', 'name city')
      .lean();

    // Filter by eligibility, valid user, and optional city match.
    const eligible = profiles.filter((p) => {
      if (!p.user) return false; // Filter out orphaned profiles
      const { eligible } = getEligibility(p.gender, p.lastDonationDate);
      if (!eligible) return false; // Filter out donors currently in cooldown
      if (city && p.user?.city?.toLowerCase() !== city.toLowerCase()) return false;
      return true;
    });

    const total     = eligible.length;
    const paginated = eligible.slice(skip, skip + limitNum);

    // Anonymise — seeker never sees donor identity.
    const results = paginated.map((p) => ({
      donorId:    p._id,
      bloodGroup: p.bloodGroup,
      city:       p.user?.city || 'Unknown',
      level:      getDonorLevel(p.confirmedDonations),
    }));

    return res.status(200).json({
      success: true,
      data: {
        patientBloodGroup,
        compatibilitySummary: summary,
        hospitalStock,
        results,
        total,
        page:  pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/seekers/requests ────────────────────────────────────────────────
/**
 * Submits a new blood request with a supporting document upload.
 * Requires seeker authentication.
 *
 * Multipart body fields:
 *   patientBloodGroup (required)
 *   hospitalName      (required)
 *   hospitalCity      (optional)
 *   unitsNeeded       (optional, default 1)
 *   urgency           (optional: routine|urgent|critical)
 *   patientName       (optional)
 *   additionalNotes   (optional)
 *   document          (required file — JPEG/PNG/WebP/HEIC/PDF, max 5 MB)
 */
router.post(
  '/requests',
  requireAuth,
  requireRole(['seeker']),
  upload.array('documents', 3),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one document file (hospital blood request slip) is required.',
        });
      }

      const {
        patientBloodGroup,
        hospitalName,
        hospitalCity,
        hospitalAddress,
        latitude,
        longitude,
        mapsUrl,
        unitsNeeded,
        urgency,
        patientName,
        additionalNotes,
      } = req.body;

      if (!patientBloodGroup || !hospitalName) {
        return res.status(400).json({
          success: false,
          message: 'patientBloodGroup and hospitalName are required.',
        });
      }

      if (!ALL_BLOOD_GROUPS.includes(patientBloodGroup)) {
        return res.status(400).json({
          success: false,
          message: `patientBloodGroup must be one of: ${ALL_BLOOD_GROUPS.join(', ')}.`,
        });
      }

      // Upload all document buffers to Cloudinary.
      const uploadPromises = req.files.map(file => 
        uploadBuffer(file.buffer, 'bloodsync/requests', null, file.mimetype)
      );
      const uploadResults = await Promise.all(uploadPromises);

      const request = await Request.create({
        seeker:            req.user.id,
        patientBloodGroup,
        hospitalName:      hospitalName.trim(),
        hospitalCity:      hospitalCity?.trim(),
        hospitalAddress:   hospitalAddress?.trim(),
        latitude:          latitude ? parseFloat(latitude) : undefined,
        longitude:         longitude ? parseFloat(longitude) : undefined,
        mapsUrl:           mapsUrl?.trim() || (latitude && longitude ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : undefined),
        unitsNeeded:       unitsNeeded ? parseInt(unitsNeeded, 10) : 1,
        urgency:           urgency || 'routine',
        patientName:       patientName?.trim(),
        additionalNotes:   additionalNotes?.trim(),
        documentUrls:      uploadResults.map(res => res.secure_url),
        documentPublicIds: uploadResults.map(res => res.public_id),
      });

      // Notify Admins about new request pending review
      const { notifyAdmins } = require('../../utils/webPush');
      notifyAdmins({
        type: 'admin_alert',
        title: `🩸 New Request: ${request.patientBloodGroup} (${request.unitsNeeded || 1} units)`,
        message: `Seeker submitted a request for ${request.patientBloodGroup} blood at ${request.hospitalName} requiring admin review.`,
        link: '/dashboard/admin',
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message:
          'Request submitted and is now pending admin review. You will be notified once approved.',
        data: {
          requestId:  request._id,
          status:     request.status,
          bloodGroup: request.patientBloodGroup,
          createdAt:  request.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/seekers/requests/mine ────────────────────────────────────────────
/**
 * Returns the authenticated seeker's own requests in reverse-chronological order.
 * Includes all fields visible to the seeker (status, hospital, admin note, etc.)
 * but excludes documentPublicId.
 *
 * Query params: page, limit, status (optional filter)
 */
router.get(
  '/requests/mine',
  requireAuth,
  requireRole(['seeker']),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const pageNum  = Math.max(parseInt(page, 10), 1);
      const limitNum = Math.min(parseInt(limit, 10), 50);
      const skip     = (pageNum - 1) * limitNum;

      const filter = { seeker: req.user.id };
      if (status) filter.status = status;

      const [requests, total] = await Promise.all([
        Request.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Request.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          requests,
          total,
          page:  pageNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/seekers/requests/:id ─────────────────────────────────────────
/**
 * Cancels a request that is still in 'pending_review'. Once a request is
 * approved or rejected the seeker can no longer cancel it.
 */
router.delete(
  '/requests/:id',
  requireAuth,
  requireRole(['seeker']),
  async (req, res, next) => {
    try {
      const request = await Request.findOne({
        _id:    req.params.id,
        seeker: req.user.id,
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
      }

      if (!['pending_review', 'approved'].includes(request.status)) {
        return res.status(400).json({
          success: false,
          message: `This request is ${request.status} and cannot be cancelled.`,
        });
      }

      request.status      = 'cancelled';
      request.cancelledAt = new Date();
      if (!request.documentUrls || request.documentUrls.length === 0) {
        if (request.documentUrl) {
          request.documentUrls = [request.documentUrl];
        } else {
          request.documentUrls = ['https://res.cloudinary.com/placeholder.png'];
        }
      }
      await request.save({ validateModifiedOnly: true });

      return res.status(200).json({
        success: true,
        message: 'Request cancelled.',
        data: { requestId: request._id, status: request.status },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/seekers/compatibility ────────────────────────────────────────────
/**
 * Returns the full compatibility matrix for a given blood group.
 * Useful for the "Who can donate to me?" info card on the seeker dashboard.
 *
 * Query params: bloodGroup (required)
 */
router.get('/compatibility', async (req, res, next) => {
  try {
    const { bloodGroup } = req.query;

    if (!bloodGroup || !ALL_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: `bloodGroup must be one of: ${ALL_BLOOD_GROUPS.join(', ')}.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: getCompatibilitySummary(bloodGroup),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
