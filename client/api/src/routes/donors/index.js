/**
 * Donor routes.
 *
 * All routes require a verified, non-blocked donor account (requireAuth +
 * requireRole(['donor'])). The eligibility result and recognition level are
 * computed on every GET /me response so they are always current — no cron
 * job, no stale boolean.
 *
 * Routes:
 *   GET    /api/donors/me              — fetch own profile + eligibility + level
 *   PUT    /api/donors/me              — update editable profile fields
 *   PATCH  /api/donors/me/availability — toggle isAvailable
 *   GET    /api/donors/search          — search by blood group + city (Phase 3 dependency)
 */

'use strict';

const express = require('express');

const { DonorProfile, BLOOD_GROUPS } = require('../../models/DonorProfile');
const { User }                       = require('../../models/User');
const { Request }                    = require('../../models/Request');
const { requireAuth, requireRole }   = require('../../middleware/auth');
const { getEligibility }             = require('../../utils/eligibility');
const { getDonorLevel, getLevelProgress, LEVELS } = require('../../utils/donorLevels');

const router = express.Router();

// Every donor route requires authentication and the donor role.
router.use(requireAuth, requireRole(['donor']));

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Builds the full donor response shape.
 * Merges the User document (name, email, phone, city) with the DonorProfile
 * (blood group, eligibility, level) so the client gets everything in one call.
 *
 * @param {import('mongoose').Document} user    - User document
 * @param {import('mongoose').Document} profile - DonorProfile document
 * @returns {object}
 */
function buildDonorResponse(user, profile) {
  const eligibility   = getEligibility(profile.gender, profile.lastDonationDate);
  const level         = getDonorLevel(profile.confirmedDonations);
  const levelProgress = getLevelProgress(profile.confirmedDonations);

  // The next tier the donor is working toward (null if at max).
  const nextLevel = level?.nextLevel ?? null;
  const donationsToNextLevel = nextLevel
    ? Math.max(nextLevel.minDonations - profile.confirmedDonations, 0)
    : 0;

  return {
    id:    user._id,
    name:  user.name,
    email: user.email,
    phone: user.phone,
    city:  user.city,

    bloodGroup:           profile.bloodGroup,
    age:                  profile.age,
    gender:               profile.gender,
    isAvailable:          profile.isAvailable,
    confirmedDonations:   profile.confirmedDonations,
    bio:                  profile.bio,
    lastDonationDate:     profile.lastDonationDate,

    eligibility: {
      eligible:          eligibility.eligible,
      nextEligibleDate:  eligibility.nextEligibleDate,
      daysUntilEligible: eligibility.daysUntilEligible,
    },

    level: level
      ? {
          id:                  level.id,
          label:               level.label,
          icon:                level.icon,
          color:               level.color,
          description:         level.description,
          progress:            levelProgress,
          nextLevel:           nextLevel ? { label: nextLevel.label, icon: nextLevel.icon, minDonations: nextLevel.minDonations } : null,
          donationsToNextLevel,
        }
      : null,

    allLevels: LEVELS.map((l) => ({
      id:           l.id,
      label:        l.label,
      icon:         l.icon,
      minDonations: l.minDonations,
      unlocked:     profile.confirmedDonations >= l.minDonations,
    })),

    profileUpdatedAt: profile.updatedAt,
    memberSince:      user.createdAt,
  };
}

// ── GET /api/donors/me ────────────────────────────────────────────────────────
/**
 * Returns the authenticated donor's full profile, eligibility status, and
 * recognition level. This is the primary data source for the donor dashboard.
 */
router.get('/me', async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([
      User.findById(req.user.id),
      DonorProfile.findOne({ user: req.user.id }),
    ]);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found. Please contact support.',
      });
    }

    return res.status(200).json({
      success: true,
      data: buildDonorResponse(user, profile),
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/donors/me ────────────────────────────────────────────────────────
/**
 * Updates editable donor profile fields. Sensitive fields (confirmedDonations,
 * lastDonationDate) are intentionally excluded — they are only modified by
 * admin/hospital actions to prevent self-gaming of the eligibility engine.
 *
 * Body (all optional): { name, phone, city, age, gender, bloodGroup,
 *                        isAvailable, bio }
 */
router.put('/me', async (req, res, next) => {
  try {
    const {
      name, phone, city,        // User fields
      age, gender, bloodGroup,  // DonorProfile fields
      isAvailable, bio,
    } = req.body;

    const [user, profile] = await Promise.all([
      User.findById(req.user.id),
      DonorProfile.findOne({ user: req.user.id }),
    ]);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found.' });
    }

    // Apply User-level updates.
    if (name  !== undefined) user.name  = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (city  !== undefined) user.city  = city;

    // Apply DonorProfile updates.
    if (age        !== undefined) profile.age        = Number(age);
    if (gender     !== undefined) profile.gender     = gender;
    if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
    if (isAvailable !== undefined) profile.isAvailable = Boolean(isAvailable);
    if (bio        !== undefined) profile.bio        = bio;

    await Promise.all([user.save(), profile.save()]);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: buildDonorResponse(user, profile),
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/donors/me/availability ────────────────────────────────────────
/**
 * Quick toggle endpoint for the dashboard availability switch.
 * Accepts a single boolean field to minimise round-trip payload.
 *
 * Body: { isAvailable: boolean }
 */
router.patch('/me/availability', async (req, res, next) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean (true or false).',
      });
    }

    const profile = await DonorProfile.findOneAndUpdate(
      { user: req.user.id },
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `You are now marked as ${isAvailable ? 'available' : 'unavailable'}.`,
      data: { isAvailable: profile.isAvailable },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/donors/search ────────────────────────────────────────────────────
/**
 * Searches for available, eligible donors by blood group and optional city.
 * Used by seekers in Phase 3; exposed on the donor router for now so it can
 * be tested independently.
 *
 * Query params: bloodGroup (required), city (optional), page, limit
 *
 * Only donors who are both eligible AND available are returned — the canDonate
 * gate in the eligibility engine is intentionally applied in JS after the DB
 * query (rather than as a DB filter) because eligibility is a time-based
 * calculation not stored in the document.
 */
router.get('/search', async (req, res, next) => {
  try {
    const { bloodGroup, city, page = 1, limit = 20 } = req.query;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: `bloodGroup is required and must be one of: ${BLOOD_GROUPS.join(', ')}.`,
      });
    }

    const pageNum  = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10), 50);
    const skip     = (pageNum - 1) * limitNum;

    // Find all potentially-matching donors. Eligibility filtering happens
    // in JS because it depends on the current timestamp and cannot be indexed.
    const profiles = await DonorProfile.find({ bloodGroup, isAvailable: true })
      .populate('user', 'name city')
      .lean();

    // Apply the eligibility filter and strip sensitive data for anonymous routing.
    const now = new Date();
    const eligible = profiles.filter((p) => {
      const { eligible } = getEligibility(p.gender, p.lastDonationDate);
      if (!eligible) return false;
      // Apply city filter after eligibility to keep the city check in JS as well.
      if (city && p.user?.city?.toLowerCase() !== city.toLowerCase()) return false;
      return true;
    });

    const total      = eligible.length;
    const paginated  = eligible.slice(skip, skip + limitNum);

    // Return only anonymised donor info — seeker sees no personal details.
    const results = paginated.map((p) => ({
      donorId:    p._id,
      bloodGroup: p.bloodGroup,
      city:       p.user?.city || 'Unknown',
      level:      getDonorLevel(p.confirmedDonations),
    }));

    return res.status(200).json({
      success: true,
      data: {
        results,
        total,
        page:    pageNum,
        pages:   Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/donors/requests ──────────────────────────────────────────────────
/**
 * Returns requests that a donor might have fulfilled or been matched to.
 * For Phase 7 history + QR check-in, we return approved/fulfilled requests
 * where the donor's blood group is compatible with the requested blood group.
 * This is a best-effort history — in a real system the donor would explicitly
 * accept a request. For now we show all approved requests that match their group.
 */
router.get('/requests', async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([
      User.findById(req.user.id),
      DonorProfile.findOne({ user: req.user.id }),
    ]);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found.' });
    }

    // Fetch requests where the donor was recorded as the fulfilling donor
    const asFullfiller = await Request.find({
      fulfilledBy: req.user.id,
    }).sort({ createdAt: -1 }).limit(50).lean();

    // Fetch approved requests compatible with this donor's blood group:
    // 1. Same-city requests for routine needs
    // 2. Automatic Span Expansion: Critical & Urgent emergency requests broaden to nearby/regional donors
    const compatibleQuery = {
      status:            'approved',
      patientBloodGroup: { $in: getCompatibleGroups(profile.bloodGroup) },
      fulfilledBy:       { $exists: false },
    };

    if (user.city) {
      compatibleQuery.$or = [
        { hospitalCity: { $regex: new RegExp(`^${user.city.trim()}$`, 'i') } },
        { urgency:      { $in: ['critical', 'urgent'] } },
      ];
    }

    const compatible = await Request.find(compatibleQuery).sort({ createdAt: -1 }).limit(30).lean();

    // Clean up expired commitments on compatible requests before returning
    const now = new Date();
    compatible.forEach(r => {
      if (r.commitments && r.commitments.length > 0) {
        r.commitments.forEach(c => {
          if (c.status === 'en_route' && new Date(c.expiresAt) < now) {
            c.status = 'expired';
          }
        });
      }
    });

    const URGENCY_RANK = { critical: 1, urgent: 2, routine: 3, standard: 3, regular: 3 };
    const getUrgencyRank = (u) => URGENCY_RANK[(u || '').toLowerCase()] ?? 4;

    // Merge, deduplicate, and sort by urgency (Critical -> Urgent -> Routine), then newest first
    const seen = new Set();
    const merged = [...asFullfiller, ...compatible].filter(r => {
      if (seen.has(String(r._id))) return false;
      seen.add(String(r._id));
      return true;
    }).sort((a, b) => {
      const rankA = getUrgencyRank(a.urgency);
      const rankB = getUrgencyRank(b.urgency);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, data: merged });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/donors/requests/:id/commit
 * Donor pledges "I'm On My Way" to donate with an ETA timer (15, 30, 45, 60 mins).
 */
router.post('/requests/:id/commit', async (req, res, next) => {
  try {
    const { etaMinutes = 45 } = req.body;

    // Anti-Abuse Check: Check if donor is currently suspended from pledging
    const donorProfile = await DonorProfile.findOne({ user: req.user.id });
    if (donorProfile?.pledgeSuspendedUntil && new Date(donorProfile.pledgeSuspendedUntil) > new Date()) {
      const hoursLeft = Math.ceil((new Date(donorProfile.pledgeSuspendedUntil) - new Date()) / 3600000);
      return res.status(403).json({
        success: false,
        message: `Your travel pledge feature is temporarily suspended for ${hoursLeft} hour(s) due to multiple recent cancellations. Slot reservations require reliable commitment.`,
      });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Can only commit to active approved requests.' });
    }

    // Clean expired commitments
    const now = new Date();
    request.commitments.forEach(c => {
      if (c.status === 'en_route' && new Date(c.expiresAt) < now) {
        c.status = 'expired';
      }
    });

    // Check active en-route commitments
    const activeCommitments = request.commitments.filter(c => c.status === 'en_route');
    const existingIndex = request.commitments.findIndex(c => String(c.donor) === req.user.id && c.status === 'en_route');

    if (activeCommitments.length >= (request.unitsNeeded || 1) && existingIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'This request currently has all needed donor slots reserved by en-route donors.',
      });
    }

    const expiresAt = new Date(Date.now() + parseInt(etaMinutes, 10) * 60 * 1000);

    if (existingIndex !== -1) {
      request.commitments[existingIndex].expiresAt = expiresAt;
      request.commitments[existingIndex].etaMinutes = etaMinutes;
    } else {
      request.commitments.push({
        donor:      req.user.id,
        reservedAt: now,
        expiresAt,
        etaMinutes: parseInt(etaMinutes, 10),
        status:     'en_route',
      });
    }

    await request.save();

    // Create Notification for the Seeker
    if (request.seeker) {
      const { Notification } = require('../../models/Notification');
      await Notification.create({
        recipient: request.seeker,
        type:      'donor_en_route',
        title:     '🚗 Donor En Route!',
        message:   `A matching donor has pledged "I'm On My Way" to donate ${request.patientBloodGroup} blood at ${request.hospitalName} (Estimated Travel Time: ~${etaMinutes} mins).`,
        link:      '/dashboard/seeker',
      }).catch(err => console.error('[commit] Notification create failed:', err.message));
    }

    res.json({ success: true, message: 'Slot reserved! You are marked as en route.', data: request });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/donors/requests/:id/commit
 * Donor cancels their "I'm On My Way" pledge, freeing the slot for others.
 */
router.delete('/requests/:id/commit', async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const comm = request.commitments.find(c => String(c.donor) === req.user.id && c.status === 'en_route');
    if (comm) {
      comm.status = 'cancelled';
      await request.save();

      // Anti-Abuse Tracking: Record cancellation in donor profile
      const donorProfile = await DonorProfile.findOne({ user: req.user.id });
      if (donorProfile) {
        donorProfile.cancelledPledges = (donorProfile.cancelledPledges || 0) + 1;
        donorProfile.recentPledgeCancelHistory = donorProfile.recentPledgeCancelHistory || [];
        donorProfile.recentPledgeCancelHistory.push({ cancelledAt: new Date(), reason: 'manual_cancel' });

        // Calculate cancellations in last 24h
        const last24h = new Date(Date.now() - 24 * 3600 * 1000);
        const recentCancels = donorProfile.recentPledgeCancelHistory.filter(h => new Date(h.cancelledAt) > last24h).length;

        // Anti-Abuse Lockout: 3 cancellations within 24h triggers 24-hour pledge suspension
        if (recentCancels >= 3) {
          donorProfile.pledgeSuspendedUntil = new Date(Date.now() + 24 * 3600 * 1000);

          const { Notification } = require('../../models/Notification');
          await Notification.create({
            recipient: req.user.id,
            type:      'system',
            title:     '⚠️ Travel Pledge Feature Suspended',
            message:   'Your ability to reserve blood unit slots ("I\'m On My Way") is temporarily suspended for 24 hours due to 3 recent travel cancellations.',
            link:      '/dashboard/donor',
          }).catch(err => console.error('[anti-abuse] Notification create failed:', err.message));
        }

        await donorProfile.save();
      }

      // Notify Seeker that donor cancelled pledge
      if (request.seeker) {
        const { Notification } = require('../../models/Notification');
        await Notification.create({
          recipient: request.seeker,
          type:      'donor_cancelled_pledge',
          title:     '⚠️ Donor Travel Cancelled',
          message:   `A donor had to cancel their travel pledge for your request at ${request.hospitalName}. The blood unit slot has been re-opened for other matching donors.`,
          link:      '/dashboard/seeker',
        }).catch(err => console.error('[cancel-commit] Notification create failed:', err.message));
      }
    }

    res.json({ success: true, message: 'Commitment cancelled. Slot freed.' });
  } catch (err) {
    next(err);
  }
});

/** Returns blood groups compatible with the donor's group (can donate to) */
function getCompatibleGroups(donorGroup) {
  const map = {
    'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+':  ['O+', 'A+', 'B+', 'AB+'],
    'A-':  ['A-', 'A+', 'AB-', 'AB+'],
    'A+':  ['A+', 'AB+'],
    'B-':  ['B-', 'B+', 'AB-', 'AB+'],
    'B+':  ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
  };
  return map[donorGroup] || [donorGroup];
}

module.exports = router;
