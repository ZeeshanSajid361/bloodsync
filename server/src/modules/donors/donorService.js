/**
 * Donor Service — Core donor profile, eligibility, search, and pledge management logic.
 */

'use strict';

const { DonorProfile, BLOOD_GROUPS } = require('#models/DonorProfile');
const { User } = require('#models/User');
const { Request } = require('#models/Request');
const { Notification } = require('#models/Notification');
const { getEligibility } = require('#utils/eligibility');
const { getDonorLevel, getLevelProgress, LEVELS } = require('#utils/donorLevels');
const cache = require('#utils/cache');

class DonorService {
  buildDonorResponse(user, profile) {
    const eligibility = getEligibility(profile.gender, profile.lastDonationDate);
    const level = getDonorLevel(profile.confirmedDonations);
    const levelProgress = getLevelProgress(profile.confirmedDonations);
    const nextLevel = level?.nextLevel ?? null;
    const donationsToNextLevel = nextLevel
      ? Math.max(nextLevel.minDonations - profile.confirmedDonations, 0)
      : 0;

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      bloodGroup: profile.bloodGroup,
      age: profile.age,
      gender: profile.gender,
      isAvailable: profile.isAvailable,
      confirmedDonations: profile.confirmedDonations,
      bio: profile.bio,
      lastDonationDate: profile.lastDonationDate,
      eligibility: {
        eligible: eligibility.eligible,
        nextEligibleDate: eligibility.nextEligibleDate,
        daysUntilEligible: eligibility.daysUntilEligible,
      },
      level: level
        ? {
            id: level.id,
            label: level.label,
            icon: level.icon,
            color: level.color,
            description: level.description,
            progress: levelProgress,
            nextLevel: nextLevel ? { label: nextLevel.label, icon: nextLevel.icon, minDonations: nextLevel.minDonations } : null,
            donationsToNextLevel,
          }
        : null,
      allLevels: LEVELS.map((l) => ({
        id: l.id,
        label: l.label,
        icon: l.icon,
        minDonations: l.minDonations,
        unlocked: profile.confirmedDonations >= l.minDonations,
      })),
      profileUpdatedAt: profile.updatedAt,
      memberSince: user.createdAt,
    };
  }

  async getMyProfile(userId) {
    const cacheKey = `donor_me_${userId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const [user, profile] = await Promise.all([
      User.findById(userId).lean(),
      DonorProfile.findOne({ user: userId }).lean(),
    ]);

    if (!profile) throw { status: 404, message: 'Donor profile not found. Please contact support.' };

    const responseData = this.buildDonorResponse(user, profile);
    cache.set(cacheKey, responseData, 15);
    return responseData;
  }

  async updateMyProfile(userId, updates) {
    const { name, phone, city, age, gender, bloodGroup, isAvailable, bio } = updates;

    const [user, profile] = await Promise.all([
      User.findById(userId),
      DonorProfile.findOne({ user: userId }),
    ]);

    if (!profile) throw { status: 404, message: 'Donor profile not found.' };

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;

    if (age !== undefined) profile.age = Number(age);
    if (gender !== undefined) profile.gender = gender;
    if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
    if (isAvailable !== undefined) profile.isAvailable = Boolean(isAvailable);
    if (bio !== undefined) profile.bio = bio;

    await Promise.all([user.save(), profile.save()]);
    cache.del(`donor_me_${userId}`);

    return this.buildDonorResponse(user, profile);
  }

  async toggleAvailability(userId, isAvailable) {
    if (typeof isAvailable !== 'boolean') {
      throw { status: 400, message: 'isAvailable must be a boolean (true or false).' };
    }

    const profile = await DonorProfile.findOneAndUpdate(
      { user: userId },
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!profile) throw { status: 404, message: 'Donor profile not found.' };
    cache.del(`donor_me_${userId}`);

    return { isAvailable: profile.isAvailable };
  }

  async searchDonors({ bloodGroup, city, page = 1, limit = 20 }) {
    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      throw { status: 400, message: `bloodGroup is required and must be one of: ${BLOOD_GROUPS.join(', ')}.` };
    }

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10), 50);
    const skip = (pageNum - 1) * limitNum;

    const profiles = await DonorProfile.find({ bloodGroup, isAvailable: true })
      .populate('user', 'name city')
      .lean();

    const eligible = profiles.filter((p) => {
      const { eligible } = getEligibility(p.gender, p.lastDonationDate);
      if (!eligible) return false;
      if (city && p.user?.city?.toLowerCase() !== city.toLowerCase()) return false;
      return true;
    });

    const total = eligible.length;
    const paginated = eligible.slice(skip, skip + limitNum);

    const results = paginated.map((p) => ({
      donorId: p._id,
      bloodGroup: p.bloodGroup,
      city: p.user?.city || 'Unknown',
      level: getDonorLevel(p.confirmedDonations),
    }));

    return { results, total, page: pageNum, pages: Math.ceil(total / limitNum) };
  }

  getCompatibleGroups(donorGroup) {
    const map = {
      'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      'O+': ['O+', 'A+', 'B+', 'AB+'],
      'A-': ['A-', 'A+', 'AB-', 'AB+'],
      'A+': ['A+', 'AB+'],
      'B-': ['B-', 'B+', 'AB-', 'AB+'],
      'B+': ['B+', 'AB+'],
      'AB-': ['AB-', 'AB+'],
      'AB+': ['AB+'],
    };
    return map[donorGroup] || [donorGroup];
  }

  async getDonorRequests(userId) {
    const [user, profile] = await Promise.all([
      User.findById(userId),
      DonorProfile.findOne({ user: userId }),
    ]);

    if (!profile) throw { status: 404, message: 'Donor profile not found.' };

    const asFullfiller = await Request.find({ fulfilledBy: userId }).sort({ createdAt: -1 }).limit(50).lean();

    const compatibleQuery = {
      status: 'approved',
      patientBloodGroup: { $in: this.getCompatibleGroups(profile.bloodGroup) },
      fulfilledBy: { $exists: false },
    };

    if (user.city) {
      compatibleQuery.$or = [
        { hospitalCity: { $regex: new RegExp(`^${user.city.trim()}$`, 'i') } },
        { urgency: { $in: ['critical', 'urgent'] } },
      ];
    }

    const compatible = await Request.find(compatibleQuery).sort({ createdAt: -1 }).limit(30).lean();

    const now = new Date();
    compatible.forEach((r) => {
      if (r.commitments && r.commitments.length > 0) {
        r.commitments.forEach((c) => {
          if (c.status === 'en_route' && new Date(c.expiresAt) < now) {
            c.status = 'expired';
          }
        });
      }
    });

    const URGENCY_RANK = { critical: 1, urgent: 2, routine: 3, standard: 3, regular: 3 };
    const getUrgencyRank = (u) => URGENCY_RANK[(u || '').toLowerCase()] ?? 4;

    const seen = new Set();
    const merged = [...asFullfiller, ...compatible]
      .filter((r) => {
        if (seen.has(String(r._id))) return false;
        seen.add(String(r._id));
        return true;
      })
      .sort((a, b) => {
        const rankA = getUrgencyRank(a.urgency);
        const rankB = getUrgencyRank(b.urgency);
        if (rankA !== rankB) return rankA - rankB;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    return merged;
  }

  async commitToRequest(userId, requestId, etaMinutes = 45) {
    const donorProfile = await DonorProfile.findOne({ user: userId });
    if (donorProfile?.pledgeSuspendedUntil && new Date(donorProfile.pledgeSuspendedUntil) > new Date()) {
      const hoursLeft = Math.ceil((new Date(donorProfile.pledgeSuspendedUntil) - new Date()) / 3600000);
      throw {
        status: 403,
        message: `Your travel pledge feature is temporarily suspended for ${hoursLeft} hour(s) due to multiple recent cancellations. Slot reservations require reliable commitment.`,
      };
    }

    const request = await Request.findById(requestId);
    if (!request) throw { status: 404, message: 'Request not found.' };
    if (request.status !== 'approved') throw { status: 400, message: 'Can only commit to active approved requests.' };

    const now = new Date();
    request.commitments.forEach((c) => {
      if (c.status === 'en_route' && new Date(c.expiresAt) < now) {
        c.status = 'expired';
      }
    });

    const activeCommitments = request.commitments.filter((c) => c.status === 'en_route');
    const existingIndex = request.commitments.findIndex((c) => String(c.donor) === userId && c.status === 'en_route');

    if (activeCommitments.length >= (request.unitsNeeded || 1) && existingIndex === -1) {
      throw { status: 400, message: 'This request currently has all needed donor slots reserved by en-route donors.' };
    }

    const expiresAt = new Date(Date.now() + parseInt(etaMinutes, 10) * 60 * 1000);

    if (existingIndex !== -1) {
      request.commitments[existingIndex].expiresAt = expiresAt;
      request.commitments[existingIndex].etaMinutes = etaMinutes;
    } else {
      request.commitments.push({
        donor: userId,
        reservedAt: now,
        expiresAt,
        etaMinutes: parseInt(etaMinutes, 10),
        status: 'en_route',
      });
    }

    await request.save();

    if (request.seeker) {
      const hospitalMapsUrl =
        request.location?.mapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospitalName + ' ' + (request.hospitalCity || ''))}`;
      Notification.create({
        recipient: request.seeker,
        type: 'donor_en_route',
        title: '🚗 Donor En Route!',
        message: `A matching donor has pledged "I'm On My Way" to donate ${request.patientBloodGroup} blood at ${request.hospitalName} (Estimated Travel Time: ~${etaMinutes} mins).`,
        link: '/dashboard/seeker',
        mapsUrl: hospitalMapsUrl,
      }).catch((err) => console.error('[commit] Notification create failed:', err.message));
    }

    return request;
  }

  async cancelCommitment(userId, requestId) {
    const request = await Request.findById(requestId);
    if (!request) throw { status: 404, message: 'Request not found.' };

    const comm = request.commitments.find((c) => String(c.donor) === userId && c.status === 'en_route');
    if (comm) {
      comm.status = 'cancelled';
      await request.save();

      const donorProfile = await DonorProfile.findOne({ user: userId });
      if (donorProfile) {
        donorProfile.cancelledPledges = (donorProfile.cancelledPledges || 0) + 1;
        donorProfile.recentPledgeCancelHistory = donorProfile.recentPledgeCancelHistory || [];
        donorProfile.recentPledgeCancelHistory.push({ cancelledAt: new Date(), reason: 'manual_cancel' });

        const last24h = new Date(Date.now() - 24 * 3600 * 1000);
        const recentCancels = donorProfile.recentPledgeCancelHistory.filter((h) => new Date(h.cancelledAt) > last24h).length;

        if (recentCancels >= 3) {
          donorProfile.pledgeSuspendedUntil = new Date(Date.now() + 24 * 3600 * 1000);
          Notification.create({
            recipient: userId,
            type: 'system',
            title: '⚠️ Travel Pledge Feature Suspended',
            message: 'Your ability to reserve blood unit slots ("I\'m On My Way") is temporarily suspended for 24 hours due to 3 recent travel cancellations.',
            link: '/dashboard/donor',
          }).catch((err) => console.error('[anti-abuse] Notification create failed:', err.message));
        }

        await donorProfile.save();
      }

      if (request.seeker) {
        Notification.create({
          recipient: request.seeker,
          type: 'donor_cancelled_pledge',
          title: '⚠️ Donor Travel Cancelled',
          message: `A donor had to cancel their travel pledge for your request at ${request.hospitalName}. The blood unit slot has been re-opened for other matching donors.`,
          link: '/dashboard/seeker',
        }).catch((err) => console.error('[cancel-commit] Notification create failed:', err.message));
      }
    }

    return true;
  }
}

module.exports = new DonorService();
