/**
 * Admin & Verification routes  —  Phase 5
 *
 * All routes require authentication + admin role.
 *
 * Route map:
 *
 *  Hospitals:
 *   GET    /api/admin/hospitals              All orgs with optional status filter
 *   PATCH  /api/admin/hospitals/:id/approve  Approve + issue API key
 *   PATCH  /api/admin/hospitals/:id/reject   Reject with admin note
 *   POST   /api/admin/hospitals/:id/revoke-key  Revoke issued API key
 *
 *  Requests:
 *   GET    /api/admin/requests               All requests with optional status filter
 *   PATCH  /api/admin/requests/:id/approve   Approve a pending_review request
 *   PATCH  /api/admin/requests/:id/reject    Reject + delete Cloudinary document
 *   PATCH  /api/admin/requests/:id/fulfill   Mark as fulfilled (donation confirmed)
 *
 *  Users:
 *   GET    /api/admin/users                  Search / list all users
 *   PATCH  /api/admin/users/:id/block        Block or unblock a user account
 *
 *  Analytics:
 *   GET    /api/admin/analytics              Platform-wide stats
 */

'use strict';

const router   = require('express').Router();
const mongoose = require('mongoose');

const { requireAuth, requireRole } = require('../../middleware/auth');
const { Organization }             = require('../../models/Organization');
const { Inventory }                = require('../../models/Inventory');
const { Request }                  = require('../../models/Request');
const { User }                     = require('../../models/User');
const { DonorProfile }             = require('../../models/DonorProfile');
const { generateApiKey }           = require('../../utils/apiKey');
const { deleteAsset }              = require('../../utils/cloudinaryUpload');
const { notifyUser, notifyCompatibleDonors } = require('../../utils/webPush');

// Every admin route requires a valid admin JWT.
router.use(requireAuth, requireRole(['admin']));

/* ── Helpers ────────────────────────────────────────────────────────────── */

function validateId(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid ID.' });
    return false;
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   HOSPITAL / ORGANISATION MANAGEMENT
══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/hospitals?status=pending&type=hospital&page=1
 *
 * Lists all organisations with optional filters.
 * Populates owner name and email for the admin review view.
 */
router.get('/hospitals', async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;

    const [orgs, total] = await Promise.all([
      Organization.find(filter)
        .populate('owner', 'name email createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Organization.countDocuments(filter),
    ]);

    res.json({ success: true, data: { orgs, total, page: Number(page) } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/hospitals/:id/approve
 *
 * Approves an organisation and issues a one-time API key.
 * The raw key is returned in the response and must be shared with the hospital
 * by the admin — it is never retrievable again.
 */
router.patch('/hospitals/:id/approve', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found.' });
    if (org.status === 'approved') {
      return res.status(409).json({ success: false, message: 'Organisation is already approved.' });
    }

    org.status     = 'approved';
    org.approvedAt = new Date();
    org.adminNote  = req.body.note || undefined;

    await org.save();

    const noteMsg = req.body.note ? ` Note: "${req.body.note}"` : '';
    if (org.owner) {
      await notifyUser({
        userId:  org.owner,
        type:    'system',
        title:   'Organisation Approved 🎉',
        message: `Organisation "${org.name}" approved.${noteMsg}`,
        link:    '/dashboard/hospital',
      }).catch(e => console.error('[admin] Approval notification error:', e));
    }

    res.json({
      success: true,
      message: 'Organisation approved successfully.',
      data: { org },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/hospitals/:id/reject
 *
 * Rejects a pending organisation with an optional note explaining why.
 */
router.patch('/hospitals/:id/reject', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found.' });

    org.status     = 'rejected';
    org.rejectedAt = new Date();
    org.adminNote  = req.body.note || 'Application did not meet requirements.';

    await org.save();

    if (org.owner) {
      await notifyUser({
        userId:  org.owner,
        type:    'system',
        title:   'Registration Rejected ❌',
        message: `Hospital "${org.name}" not approved. ${org.adminNote ? `Reason: "${org.adminNote}"` : ''}`,
        link:    '/dashboard/hospital',
      }).catch(e => console.error('[admin] Rejection notification error:', e));
    }

    res.json({ success: true, message: 'Organisation rejected.', data: { org } });


  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/hospitals/:id/revoke-key
 *
 * Invalidates the API key for an approved hospital.  The hospital can request
 * a new one by contacting the admin, who then calls approve again.
 */
router.post('/hospitals/:id/revoke-key', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const org = await Organization.findById(req.params.id).select('+apiKeyHash');
    if (!org)          return res.status(404).json({ success: false, message: 'Organisation not found.' });
    if (!org.apiKeyHash) return res.status(400).json({ success: false, message: 'No active API key to revoke.' });

    org.apiKeyHash = undefined;
    org.apiKeyPrefix = undefined;
    await org.save();

    res.json({ success: true, message: 'API key revoked. The hospital can no longer use /inventory/sync.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/hospitals/:id/regenerate-key
 *
 * Generates a new API key for an approved EMN hospital and returns the raw key.
 */
router.post('/hospitals/:id/regenerate-key', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found.' });
    if (org.type !== 'api_hospital') {
      return res.status(400).json({ success: false, message: 'Only EMN API Hospitals support API key generation.' });
    }

    const { rawKey, hash } = await generateApiKey();
    org.apiKeyHash   = hash;
    org.apiKeyPrefix = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
    await org.save();

    res.json({
      success: true,
      message: 'New API key generated successfully.',
      data: {
        org,
        apiKey: rawKey,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   BLOOD REQUEST VERIFICATION
══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/requests?status=pending_review&bloodGroup=O%2B&page=1
 *
 * Lists requests for the admin review queue with optional filters.
 * Populates seeker name/email (anonymised display — only shown to admin).
 */
router.get('/requests', async (req, res, next) => {
  try {
    const { status, bloodGroup, urgency, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)     filter.status             = status;
    if (bloodGroup) filter.patientBloodGroup  = bloodGroup;
    if (urgency)    filter.urgency            = urgency;

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate('seeker', 'name email phone city')
        .populate('hospital', 'name address.city')
        .select('+documentPublicId')
        .sort({ urgency: -1, createdAt: 1 }) // critical first, then FIFO
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Request.countDocuments(filter),
    ]);

    res.json({ success: true, data: { requests, total, page: Number(page) } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/requests/:id/approve
 *
 * Approves a pending_review request. Phase 6 will fire donor notifications here.
 */
router.patch('/requests/:id/approve', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending_review') {
      return res.status(409).json({ success: false, message: `Cannot approve a request with status '${request.status}'.` });
    }

    request.status     = 'approved';
    request.adminNote  = req.body.note || undefined;
    request.reviewedAt = new Date();

    await request.save();

    // Phase 6: notify compatible donors + notify seeker.
    const org = request.hospital
      ? await Organization.findById(request.hospital).lean()
      : null;

    // Fire-and-forget — don't block the HTTP response.
    notifyCompatibleDonors(request, org).catch(() => {});
    notifyUser({
      userId:  request.seeker,
      type:    'request_approved',
      title:   'Blood Request Approved ✅',
      message: `Your ${request.patientBloodGroup} request at ${request.hospitalName} has been verified. Donors are being notified.`,
      link:    '/dashboard/seeker',
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Request approved. Donors notified.',
      data: { request },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/requests/:id/reject
 *
 * Rejects a request and deletes the uploaded document from Cloudinary to
 * avoid storing unverified medical documents.
 */
router.patch('/requests/:id/reject', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const request = await Request.findById(req.params.id).select('+documentPublicId');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (!['pending_review'].includes(request.status)) {
      return res.status(409).json({ success: false, message: `Cannot reject a request with status '${request.status}'.` });
    }

    // Delete the uploaded document from Cloudinary.
    if (request.documentPublicId) {
      await deleteAsset(request.documentPublicId).catch(() => {
        // Non-fatal — log but don't block the rejection.
        console.warn(`[admin] Failed to delete Cloudinary asset: ${request.documentPublicId}`);
      });
    }

    request.status     = 'rejected';
    request.adminNote  = req.body.note || 'Your request document could not be verified.';
    request.reviewedAt = new Date();

    await request.save();

    // Phase 6: notify seeker of rejection.
    notifyUser({
      userId:  request.seeker,
      type:    'request_rejected',
      title:   'Blood Request Rejected',
      message: `Your ${request.patientBloodGroup} request could not be verified. Reason: ${request.adminNote}`,
      link:    '/dashboard/seeker',
    }).catch(() => {});

    res.json({ success: true, message: 'Request rejected and document removed.', data: { request } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/requests/:id/fulfill
 *
 * Marks a request as fulfilled (donation completed). Also updates the
 * donor's lastDonationDate if a donorId is passed in the body (used in Phase 7
 * when QR check-in is wired up).
 */
router.patch('/requests/:id/fulfill', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'approved') {
      return res.status(409).json({ success: false, message: 'Only approved requests can be marked as fulfilled.' });
    }

    request.status      = 'fulfilled';
    request.fulfilledAt = new Date();

    await request.save();

    // Update the donor's last donation date if the responding donor is known.
    if (req.body.donorId && mongoose.isValidObjectId(req.body.donorId)) {
      await User.findByIdAndUpdate(req.body.donorId, {
        lastDonationDate: new Date(),
      });
    }

    res.json({ success: true, message: 'Request marked as fulfilled.', data: { request } });
  } catch (err) {
    next(err);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   USER MANAGEMENT
══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/users?role=donor&search=zeeshan&page=1
 *
 * Lists all users with optional role filter and name/email search.
 */
router.get('/users', async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter, { password: 0, emailVerificationToken: 0, refreshTokens: 0 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map(u => u._id);

    const [donorProfiles, seekerRequests] = await Promise.all([
      DonorProfile.find({ user: { $in: userIds } }).select('user confirmedDonations bloodGroup').lean(),
      Request.find({ seeker: { $in: userIds } }).select('seeker status unitsNeeded patientBloodGroup').lean(),
    ]);

    const dpMap = new Map(donorProfiles.map(dp => [dp.user.toString(), dp]));
    const reqsMap = new Map();
    seekerRequests.forEach(r => {
      if (!r.seeker) return;
      const sId = r.seeker.toString();
      if (!reqsMap.has(sId)) reqsMap.set(sId, []);
      reqsMap.get(sId).push(r);
    });

    const enrichedUsers = users.map((u) => {
      const uIdStr = u._id.toString();
      const reqs = reqsMap.get(uIdStr) || [];
      const totalRequests = reqs.length;
      const pendingReqs = reqs.filter(r => r.status === 'pending_review' || r.status === 'approved');
      const pendingRequests = pendingReqs.length;
      const pendingUnits = pendingReqs.reduce((acc, curr) => acc + (curr.unitsNeeded || 1), 0);

      const fulfilledReqs = reqs.filter(r => r.status === 'fulfilled');
      const fulfilledRequests = fulfilledReqs.length;
      const fulfilledUnits = fulfilledReqs.reduce((acc, curr) => acc + (curr.unitsNeeded || 1), 0);

      let confirmedDonations = 0;
      let bloodGroup = '—';

      if (u.role === 'donor') {
        const dp = dpMap.get(uIdStr);
        confirmedDonations = dp?.confirmedDonations || 0;
        bloodGroup = dp?.bloodGroup || '—';
      } else if (u.role === 'seeker') {
        const uniqueGroups = [...new Set(reqs.map(r => r.patientBloodGroup).filter(Boolean))];
        if (uniqueGroups.length === 1) {
          bloodGroup = uniqueGroups[0];
        } else if (uniqueGroups.length > 1) {
          bloodGroup = uniqueGroups.join(', ');
        }
      }

      return {
        ...u,
        bloodGroup,
        stats: {
          totalRequests,
          pendingRequests,
          pendingUnits,
          fulfilledRequests,
          fulfilledUnits,
          confirmedDonations,
        },
      };
    });

    res.json({ success: true, data: { users: enrichedUsers, total, page: Number(page) } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id/block
 *
 * Toggles the isBlocked flag on a user account.
 * Body: { block: true | false }
 */
router.patch('/users/:id/block', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be blocked.' });
    }

    const block = Boolean(req.body.block);
    user.isBlocked = block;
    await user.save();

    res.json({
      success: true,
      message: block ? 'User account blocked.' : 'User account unblocked.',
      data: { userId: user._id, isBlocked: user.isBlocked },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/users/:id
 *
 * Permanently deletes a user account and cleans up associated profiles/requests.
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (!validateId(req, res)) return;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted.' });
    }

    // Clean up associated records
    const { DonorProfile } = require('../../models/DonorProfile');
    await DonorProfile.deleteMany({ user: user._id });
    await Organization.deleteMany({ owner: user._id });
    await Request.deleteMany({ requester: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({
      success: true,
      message: 'User account permanently deleted.',
      data: { userId: user._id },
    });
  } catch (err) {
    next(err);
  }
});


/* ══════════════════════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/analytics
 *
 * Returns platform-wide aggregated statistics for the admin dashboard.
 * All queries run in parallel for fast response time.
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const [
      totalUsers,
      usersByRole,
      totalRequests,
      requestsByStatus,
      requestsByBloodGroup,
      totalOrgs,
      orgsByStatus,
      totalInventoryUnits,
      lowStockItems,
      recentRequests,
    ] = await Promise.all([
      // Total registered users
      User.countDocuments(),

      // Users broken down by role
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Total blood requests
      Request.countDocuments(),

      // Requests by status
      Request.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Most-requested blood groups
      Request.aggregate([
        { $group: { _id: '$patientBloodGroup', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Total registered organisations
      Organization.countDocuments(),

      // Orgs by status
      Organization.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Total blood units across all approved hospitals
      Inventory.aggregate([
        { $group: { _id: null, total: { $sum: '$units' } } },
      ]),

      // Low-stock inventory items (units ≤ threshold)
      Inventory.aggregate([
        { $match: { $expr: { $lte: ['$units', '$lowStockThreshold'] } } },
        {
          $lookup: {
            from: 'organizations',
            localField: 'hospital',
            foreignField: '_id',
            as: 'hospitalInfo',
          },
        },
        { $unwind: '$hospitalInfo' },
        {
          $project: {
            bloodGroup: 1,
            units: 1,
            lowStockThreshold: 1,
            hospitalName: '$hospitalInfo.name',
            hospitalCity: '$hospitalInfo.address.city',
          },
        },
        { $sort: { units: 1 } },
        { $limit: 10 },
      ]),

      // Last 5 requests (for the activity feed)
      Request.find()
        .populate('seeker', 'name city')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('patientBloodGroup urgency status hospitalName createdAt')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: usersByRole,
        },
        requests: {
          total: totalRequests,
          byStatus: requestsByStatus,
          byBloodGroup: requestsByBloodGroup,
        },
        organisations: {
          total: totalOrgs,
          byStatus: orgsByStatus,
        },
        inventory: {
          totalUnits: totalInventoryUnits[0]?.total ?? 0,
          lowStockItems,
        },
        recentRequests,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
