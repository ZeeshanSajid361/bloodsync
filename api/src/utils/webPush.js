/**
 * Web Push notification utility.
 *
 * Uses self-generated VAPID keys (no external service needed — entirely free).
 * Every send attempt also writes an in-app Notification document as a
 * guaranteed-delivery fallback for users whose browsers block push.
 *
 * VAPID keys are generated once (run `node -e "require('web-push').generateVAPIDKeys()"`)
 * and stored in .env.  They never change unless you intentionally rotate them.
 */

'use strict';

const webPush       = require('web-push');
const { Notification }      = require('../models/Notification');
const { PushSubscription }  = require('../models/PushSubscription');

/* ── VAPID configuration ────────────────────────────────────────────────── */

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@bloodsync.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

/* ── Core send function ─────────────────────────────────────────────────── */

/**
 * Send a notification to all push subscriptions of a user AND write an
 * in-app Notification document.
 *
 * @param {object} options
 * @param {string}   options.userId     - MongoDB ObjectId of the recipient
 * @param {string}   options.type       - NOTIFICATION_TYPES value
 * @param {string}   options.title      - Short notification title
 * @param {string}   options.message    - Body text
 * @param {string}  [options.link]      - Optional deep-link path
 * @returns {Promise<void>}
 */
async function notifyUser({ userId, type, title, message, link }) {
  // 1. Always write the in-app notification — guaranteed delivery.
  await Notification.create({ recipient: userId, type, title, message, link });

  // 2. Fire-and-forget push to every active subscription for this user.
  //    Push is optional (user may not have subscribed or VAPID may not be
  //    configured in dev). Failures are logged but never thrown.
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, message, link });

  const sends = subscriptions.map(async (sub) => {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
        { TTL: 86400 } // let push service hold the notification for up to 24h
      );
    } catch (err) {
      // 410 Gone = subscription expired/unregistered — remove from DB.
      if (err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
      } else {
        console.warn(`[webPush] Failed to deliver to ${sub.endpoint.slice(-20)}: ${err.message}`);
      }
    }
  });

  await Promise.allSettled(sends);
}

/**
 * Notify all eligible donors when a blood request is approved.
 *
 * Eligible = isAvailable && city matches (city-level proximity, Phase 6.
 * Nominatim geo-proximity is a stretch goal for Phase 6 iteration 2).
 *
 * @param {object} request     - Mongoose Request document
 * @param {object} org         - Organisation document (for hospital name)
 */
async function notifyCompatibleDonors(request, org) {
  const { getCompatibleDonorGroups } = require('./compatibility');
  const { getEligibility }           = require('./eligibility');
  const { DonorProfile }             = require('../models/DonorProfile');
  const { User }                     = require('../models/User');

  const compatibleGroups = getCompatibleDonorGroups(request.patientBloodGroup);

  // Find donor profiles whose blood group is compatible.
  const eligibleProfiles = await DonorProfile.find({
    bloodGroup:  { $in: compatibleGroups },
    isAvailable: true,
  }).lean();

  // Filter by WHO eligibility (computed on read — no cron required).
  const eligibleIds = eligibleProfiles
    .filter(p => getEligibility(p.gender, p.lastDonationDate).eligible)
    .map(p => p.user);

  if (eligibleIds.length === 0) return;

  // Further filter by city if request has a hospitalCity.
  let targetUsers = await User.find(
    {
      _id:       { $in: eligibleIds },
      isBlocked: false,
      ...(request.hospitalCity
        ? { city: { $regex: request.hospitalCity, $options: 'i' } }
        : {}),
    },
    { _id: 1 }
  ).lean();

  if (targetUsers.length === 0) {
    // Widen to all eligible donors regardless of city.
    targetUsers = await User.find(
      { _id: { $in: eligibleIds }, isBlocked: false },
      { _id: 1 }
    ).lean();
  }

  const hospitalDisplay = org?.name || request.hospitalName;
  const urgencyLabel    = request.urgency === 'critical' ? '🚨 CRITICAL' : request.urgency === 'urgent' ? '⚠️ Urgent' : 'Blood';

  const sends = targetUsers.map(u =>
    notifyUser({
      userId:  u._id,
      type:    'donor_needed',
      title:   `${urgencyLabel} Request — ${request.patientBloodGroup}`,
      message: `A verified request for ${request.patientBloodGroup} blood at ${hospitalDisplay} needs a donor. Can you help?`,
      link:    '/dashboard/donor',
    }).catch(() => {})
  );

  await Promise.allSettled(sends);
}

/**
 * Send a notification to all Admin users.
 */
async function notifyAdmins({ type = 'admin_alert', title, message, link = '/dashboard/admin' }) {
  try {
    const { User } = require('../models/User');
    const admins = await User.find({ role: 'admin', isBlocked: false }, { _id: 1 }).lean();
    const sends = admins.map(a =>
      notifyUser({
        userId:  a._id,
        type,
        title,
        message,
        link,
      }).catch(() => {})
    );
    await Promise.allSettled(sends);
  } catch (err) {
    console.error('[notifyAdmins] Error notifying admins:', err.message);
  }
}

module.exports = { notifyUser, notifyCompatibleDonors, notifyAdmins };
