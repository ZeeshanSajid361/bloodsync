/**
 * Notifications routes  —  Phase 6
 *
 * Route map:
 *   POST  /api/notifications/subscribe     Save a push subscription
 *   GET   /api/notifications               Own notifications (paginated)
 *   GET   /api/notifications/unread-count  Fast badge count
 *   PATCH /api/notifications/:id/read      Mark one as read
 *   PATCH /api/notifications/read-all      Mark all as read
 *   DELETE /api/notifications/:id          Delete one
 *   GET   /api/notifications/forecast      7-day demand forecast (admin only)
 */

'use strict';

const router   = require('express').Router();
const mongoose = require('mongoose');

const { requireAuth, requireRole } = require('../../middleware/auth');
const { Notification }             = require('../../models/Notification');
const { PushSubscription }         = require('../../models/PushSubscription');
const { computeDemandForecast }    = require('../../utils/demandForecast');

/* ── Push subscription registration ────────────────────────────────────── */

/**
 * POST /api/notifications/subscribe
 *
 * Receives the PushSubscription object from the browser (endpoint + keys)
 * and upserts it for the authenticated user.  The frontend calls this once
 * after the user grants notification permission.
 */
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user:      req.user.id,
        endpoint,
        keys,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Push subscription registered.' });
  } catch (err) {
    next(err);
  }
});

/* ── Notification list ──────────────────────────────────────────────────── */

/**
 * GET /api/notifications?page=1&limit=20&unreadOnly=true
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { recipient: req.user.id };
    if (unreadOnly === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    res.json({ success: true, data: { notifications, total, unreadCount, page: Number(page) } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/unread-count
 *
 * Lightweight endpoint for the notification bell badge — avoids fetching
 * the full list on every poll.
 */
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

/* ── Mark as read ───────────────────────────────────────────────────────── */

router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });

    res.json({ success: true, data: { notification: notif } });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    const { modifiedCount } = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: `${modifiedCount} notification(s) marked as read.` });
  } catch (err) {
    next(err);
  }
});

/* ── Delete ─────────────────────────────────────────────────────────────── */

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const notif = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });

    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
});

/* ── Demand forecast (admin only) ───────────────────────────────────────── */

/**
 * GET /api/notifications/forecast?hospitalId=...
 *
 * Returns the 7-day moving average demand forecast.  Admin only — the data
 * includes hospital-specific consumption that should not be public.
 */
router.get('/forecast', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const forecast = await computeDemandForecast(req.query.hospitalId);
    res.json({ success: true, data: { forecast } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
