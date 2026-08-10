/**
 * Hospital & Partner Network routes  —  Phase 4
 *
 * Route map:
 *
 *   POST   /api/hospitals/register          Register a hospital / partner org
 *   GET    /api/hospitals/me                Get own org profile + inventory
 *   PUT    /api/hospitals/me                Update org profile
 *   GET    /api/hospitals/directory         Public directory of approved orgs
 *   GET    /api/hospitals/directory/:id     Single org detail (public)
 *
 *   POST   /api/hospitals/inventory         Add / upsert a blood group entry
 *   PUT    /api/hospitals/inventory/:id     Update units / expiry / threshold
 *   DELETE /api/hospitals/inventory/:id     Remove a blood group entry
 *
 *   POST   /api/hospitals/inventory/sync    API-key-protected machine sync
 *   POST   /api/hospitals/broadcast         Issue a Code Red alert (6-hr TTL)
 *   DELETE /api/hospitals/broadcast/:invId  Cancel an active Code Red
 */

'use strict';

const router  = require('express').Router();
const mongoose = require('mongoose');

const { requireAuth, requireRole } = require('../../middleware/auth');
const { Organization }             = require('../../models/Organization');
const { Inventory, BLOOD_GROUPS }  = require('../../models/Inventory');
const { generateApiKey, verifyApiKey } = require('../../utils/apiKey');
const upload                       = require('../../middleware/upload');
const { uploadBuffer }             = require('../../utils/cloudinaryUpload');

/* ─── helpers ──────────────────────────────────────────────────────────────── */

/**
 * Checks whether a Code Red is still live (within the 6-hour window).
 * Mutates the inventory document's codeRed sub-object if the broadcast has
 * expired so the client always receives an accurate state.
 *
 * @param {object} inv - Inventory mongoose document (or plain object)
 * @returns {boolean}
 */
function isCodeRedActive(inv) {
  if (!inv.codeRed?.active) return false;
  if (!inv.codeRed.expiresAt) return false;
  if (new Date() > new Date(inv.codeRed.expiresAt)) {
    inv.codeRed.active = false;
    return false;
  }
  return true;
}

/**
 * Middleware: resolve the org that belongs to the authenticated hospital user.
 * Attaches `req.org` to the request. Returns 404 if the user has no org yet.
 */
async function requireOrg(req, res, next) {
  try {
    const userId = req.user.id || req.user._id;
    const org = await Organization.findOne({ owner: userId });
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'No organisation profile found for this account. Please register first.',
      });
    }
    req.org = org;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: hospital API-key authentication for the /sync endpoint.
 * The key must be sent as:  Authorization: ApiKey bl_xxxxx...
 */
async function requireApiKey(req, res, next) {
  try {
    const header = (req.headers.authorization || '').trim();
    if (!header) {
      return res.status(401).json({ success: false, message: 'API key required.' });
    }

    // Support both "ApiKey bl_xxx" and "bl_xxx"
    const rawKey = header.startsWith('ApiKey ') ? header.slice(7).trim() : header;

    // The hospital is identified by the key prefix lookup — we find the org
    // whose hashed key matches. bcrypt.compare is used; it's safe to loop
    // through approved hospitals because the set is small and we exit on first match.
    const hospitals = await Organization.find(
      { type: 'hospital', status: 'approved' },
      { apiKeyHash: 1 }   // select: false is on the field; explicit projection overrides
    ).lean();

    let matchedOrg = null;
    for (const hosp of hospitals) {
      if (hosp.apiKeyHash && await verifyApiKey(rawKey, hosp.apiKeyHash)) {
        matchedOrg = hosp;
        break;
      }
    }

    if (!matchedOrg) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked API key.' });
    }

    req.apiHospitalId = matchedOrg._id;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/hospitals/inventory/sync
 *
 * Automated machine-to-machine inventory sync endpoint for Enterprise Hospitals.
 * Header: Authorization: ApiKey bl_xxx (or Authorization: bl_xxx)
 * Body: { "updates": [ { "bloodGroup": "O+", "units": 45 }, { "bloodGroup": "A-", "units": 8 } ] }
 */
router.post('/inventory/sync', requireApiKey, async (req, res, next) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: updates must be a non-empty array of { bloodGroup, units }',
      });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const results = [];

    for (const item of updates) {
      const { bloodGroup, units } = item;

      if (!validBloodGroups.includes(bloodGroup) || typeof units !== 'number' || units < 0) {
        results.push({ bloodGroup, units, status: 'failed', error: 'Invalid blood group or units count' });
        continue;
      }

      const inv = await Inventory.findOneAndUpdate(
        { hospital: req.apiHospitalId, bloodGroup },
        {
          hospital:      req.apiHospitalId,
          bloodGroup,
          units,
          lastUpdatedBy: 'api',
          updatedAt:     new Date(),
        },
        { upsert: true, new: true }
      );

      results.push({ bloodGroup: inv.bloodGroup, units: inv.units, status: 'synced' });
    }

    // Update lastSyncedAt on Organisation
    await Organization.findByIdAndUpdate(req.apiHospitalId, { lastSyncedAt: new Date() });

    res.json({
      success: true,
      message: 'Sync complete.',
      data: { results, lastSyncedAt: new Date() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hospitals/inventory/discrepancy
 * Report an inventory discrepancy for admin review.
 */
router.post('/inventory/discrepancy', requireAuth, requireRole(['hospital', 'admin']), requireOrg, async (req, res, next) => {
  try {
    const { bloodGroup, reportedUnits, expectedUnits, notes, inventoryId } = req.body;
    if (!bloodGroup || reportedUnits === undefined || expectedUnits === undefined) {
      return res.status(400).json({ success: false, message: 'Blood group, reported units, and expected units are required.' });
    }

    const { Discrepancy } = require('../../models/Discrepancy');
    const report = await Discrepancy.create({
      organizationId: req.org._id,
      inventoryId: inventoryId || undefined,
      bloodGroup,
      reportedUnits: Number(reportedUnits),
      expectedUnits: Number(expectedUnits),
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Discrepancy report logged and sent to System Admins for review.',
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hospitals/requests/:id/fulfill-api
 * Machine-to-machine REST API endpoint to fulfill a request for EMN hospitals.
 * Header: Authorization: ApiKey bl_xxx (or Authorization: bl_xxx)
 */
router.post('/requests/:id/fulfill-api', requireApiKey, async (req, res, next) => {
  try {
    const { Request } = require('../../models/Request');
    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    reqDoc.status = 'fulfilled';
    reqDoc.fulfilledAt = new Date();
    reqDoc.fulfilledVia = 'api';
    await reqDoc.save();

    await Organization.findByIdAndUpdate(req.apiHospitalId, { lastSyncedAt: new Date() });

    res.json({
      success: true,
      message: 'Request marked as fulfilled via API.',
      data: reqDoc,
    });
  } catch (err) {
    next(err);
  }
});

/* ─── Registration ──────────────────────────────────────────────────────────── */

/**
 * POST /api/hospitals/register
 *
 * Creates a new Organisation document linked to the authenticated user.
 * Status starts as 'pending' — an admin must approve it before the org
 * appears in the public directory.
 */
router.post(
  '/register',
  requireAuth,
  requireRole(['hospital']),
  upload.array('verificationDocuments', 3),
  async (req, res, next) => {
    try {
      const { name, type = 'hospital', city, street, province, mapsUrl, latitude, longitude, phone, email } = req.body;

      if (!name || !city) {
        return res.status(400).json({ success: false, message: 'Name and city are required.' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one registration/verification document is required.' });
      }

      const existing = await Organization.findOne({ owner: req.user.id });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You have already registered an organisation. Update it via PUT /api/hospitals/me.',
        });
      }

      const uploadPromises = req.files.map(file => 
        uploadBuffer(file.buffer, 'bloodsync/hospitals', null, file.mimetype)
      );
      const uploadResults = await Promise.all(uploadPromises);

      const verificationDocumentUrls = uploadResults.map(r => r.secure_url);
      const verificationDocumentPublicIds = uploadResults.map(r => r.public_id);

      const org = await Organization.create({
        owner:   req.user.id,
        name,
        type,
        address: { city, street, province, mapsUrl, latitude, longitude },
        phone,
        email:   email || req.user.email,
        status:  'pending',
        verificationDocumentUrls,
        verificationDocumentPublicIds,
      });

      // Notify Admins about new hospital pending verification
      const { notifyAdmins } = require('../../utils/webPush');
      notifyAdmins({
        type: 'admin_alert',
        title: `🏥 New Hospital Registration: ${name}`,
        message: `${name} (${city}) registered and requires admin document verification.`,
        link: '/dashboard/admin',
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'Organisation registered. Pending admin approval.',
        data: { org },
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ─── Own profile ───────────────────────────────────────────────────────────── */

/**
 * GET /api/hospitals/me
 *
 * Returns the org profile plus all inventory entries and their current
 * Code Red status (expired broadcasts are filtered out on read).
 */
router.get(
  '/me',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      const inventory = await Inventory.find({ hospital: req.org._id }).lean();

      // Clean up expired Code Red flags on read — no cron needed.
      const now = new Date();
      inventory.forEach((inv) => {
        if (inv.codeRed?.active && inv.codeRed.expiresAt && now > inv.codeRed.expiresAt) {
          inv.codeRed.active = false;
        }
      });

      res.json({
        success: true,
        data: {
          org: req.org,
          inventory,
        },
      });

    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/hospitals/me
 *
 * Update own org's mutable fields (name, contact info, address).
 * Status and apiKeyHash are intentionally excluded.
 */
router.put(
  '/me',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      const { name, city, street, province, mapsUrl, latitude, longitude, phone, email } = req.body;

      if (name)      req.org.name              = name;
      if (city)      req.org.address.city      = city;
      if (street)    req.org.address.street    = street;
      if (province)  req.org.address.province  = province;
      if (mapsUrl !== undefined)   req.org.address.mapsUrl   = mapsUrl;
      if (latitude !== undefined)  req.org.address.latitude  = latitude;
      if (longitude !== undefined) req.org.address.longitude = longitude;
      if (phone)     req.org.phone             = phone;
      if (email)     req.org.email             = email;

      await req.org.save();

      res.json({ success: true, message: 'Profile updated.', data: { org: req.org } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/hospitals/me/generate-api-key
 *
 * Generate or regenerate a REST API Key for EMN hospitals.
 * Returns the unhashed key ONCE for the user to copy.
 */
router.post(
  '/me/generate-api-key',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      if (req.org.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Organisation must be approved before issuing an API key.' });
      }

      const { rawKey, hash } = await generateApiKey();
      req.org.apiKeyHash   = hash;
      req.org.apiKeyPrefix = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
      await req.org.save();

      res.json({
        success: true,
        message: 'New API Key generated successfully.',
        data: {
          apiKey: rawKey,
          apiKeyPrefix: req.org.apiKeyPrefix,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ─── Public directory ──────────────────────────────────────────────────────── */

/**
 * GET /api/hospitals/directory?type=hospital&city=Islamabad
 *
 * Lists all approved organisations. Used by seekers when submitting a request
 * to pick a verified hospital, and by the public to find donation locations.
 */
router.get('/directory', async (req, res, next) => {
  try {
    const filter = { status: 'approved' };
    if (req.query.type && ['hospital', 'partner'].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    if (req.query.city) {
      filter['address.city'] = { $regex: req.query.city, $options: 'i' };
    }

    const orgs = await Organization.find(filter, {
      apiKeyHash: 0,  // never expose even the hash
      adminNote:  0,
    })
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: { orgs, count: orgs.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hospitals/directory/:id
 *
 * Single approved org with its public inventory (units per blood group).
 */
router.get('/directory/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID.' });
    }

    const org = await Organization.findOne(
      { _id: req.params.id, status: 'approved' },
      { apiKeyHash: 0, adminNote: 0 }
    ).lean();

    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found.' });

    const inventory = await Inventory.find({ hospital: org._id }).lean();

    const now = new Date();
    inventory.forEach((inv) => {
      if (inv.codeRed?.active && inv.codeRed.expiresAt && now > inv.codeRed.expiresAt) {
        inv.codeRed.active = false;
      }
    });

    res.json({ success: true, data: { org, inventory } });
  } catch (err) {
    next(err);
  }
});

/* ─── Inventory CRUD ────────────────────────────────────────────────────────── */

/**
 * POST /api/hospitals/inventory
 *
 * Upsert a blood group entry.  If the blood group already exists for this
 * hospital the document is updated, otherwise it is created.  This makes
 * the UI add-form idempotent.
 */
router.post(
  '/inventory',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      if (req.org.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Your organisation must be approved before managing inventory.',
        });
      }

      const { bloodGroup, units, expiresAt, lowStockThreshold } = req.body;

      if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ success: false, message: 'Valid blood group is required.' });
      }
      if (units === undefined || units < 0) {
        return res.status(400).json({ success: false, message: 'Units must be 0 or greater.' });
      }

      const threshold = lowStockThreshold !== undefined ? Number(lowStockThreshold) : 2;

      // Rule 1: New stock batch units must meet or exceed threshold
      if (Number(units) < threshold) {
        return res.status(400).json({
          success: false,
          message: `New stock batch units (${units}) cannot be less than low stock threshold (${threshold}).`,
        });
      }

      // Rule 3: Expiry date must be today or in the future
      if (expiresAt) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (new Date(expiresAt) < todayStart) {
          return res.status(400).json({ success: false, message: 'Batch expiry date cannot be in the past.' });
        }
      }

      const inv = await Inventory.create({
        hospital:          req.org._id,
        bloodGroup,
        units:             Number(units),
        expiresAt:         expiresAt || undefined,
        lowStockThreshold: threshold,
        lastUpdatedBy:     'manual',
      });

      res.status(201).json({ success: true, message: 'Inventory entry saved.', data: { inventory: inv } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/hospitals/inventory/:id
 *
 * Update an existing inventory record.
 */
router.put(
  '/inventory/:id',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid inventory ID.' });
      }

      const inv = await Inventory.findOne({ _id: req.params.id, hospital: req.org._id });
      if (!inv) {
        return res.status(404).json({ success: false, message: 'Inventory record not found.' });
      }

      const { units, expiresAt, lowStockThreshold } = req.body;

      if (units !== undefined) {
        if (units < 0) return res.status(400).json({ success: false, message: 'Units cannot be negative.' });
        inv.units = Number(units);
      }
      if (lowStockThreshold !== undefined) inv.lowStockThreshold = Number(lowStockThreshold);

      if (expiresAt !== undefined && expiresAt) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (new Date(expiresAt) < todayStart) {
          return res.status(400).json({ success: false, message: 'Batch expiry date cannot be in the past.' });
        }
        inv.expiresAt = expiresAt;
      }

      // Rule 2: If stock count drops to or below threshold, auto-trigger Code Red Emergency Alert
      if (inv.units <= inv.lowStockThreshold) {
        inv.codeRed = {
          active: true,
          message: `Automatic Emergency Alert: Stock for ${inv.bloodGroup} at ${req.org.name} has dropped to ${inv.units} unit(s). Urgent donors needed!`,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours TTL
        };
      } else if (inv.codeRed?.active && inv.units > inv.lowStockThreshold) {
        inv.codeRed.active = false;
      }

      inv.lastUpdatedBy = 'manual';

      await inv.save();

      res.json({ success: true, message: 'Inventory updated.', data: { inventory: inv } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/hospitals/inventory/:id
 *
 * Remove a blood group entry (e.g. the hospital no longer stocks that type).
 */
router.delete(
  '/inventory/:id',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid inventory ID.' });
      }

      const inv = await Inventory.findOneAndDelete({ _id: req.params.id, hospital: req.org._id });
      if (!inv) {
        return res.status(404).json({ success: false, message: 'Inventory record not found.' });
      }

      res.json({ success: true, message: 'Inventory entry removed.' });
    } catch (err) {
      next(err);
    }
  }
);

/* ─── API-key sync endpoint (machine-to-machine) ────────────────────────────── */

/**
 * POST /api/hospitals/inventory/sync
 *
 * Allows an approved hospital's information system (or a demo simulation
 * script) to push bulk stock updates via an API key.
 *
 * Body: { updates: [{ bloodGroup: 'O+', units: 12, expiresAt: '...' }, ...] }
 *
 * Authorization: ApiKey bl_<raw key>
 */
router.post('/inventory/sync', requireApiKey, async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: '`updates` array is required.' });
    }

    const results = [];
    for (const item of updates) {
      const { bloodGroup, units, expiresAt } = item;

      if (!BLOOD_GROUPS.includes(bloodGroup)) {
        results.push({ bloodGroup, status: 'skipped', reason: 'Unknown blood group' });
        continue;
      }
      if (typeof units !== 'number' || units < 0) {
        results.push({ bloodGroup, status: 'skipped', reason: 'Invalid units value' });
        continue;
      }

      await Inventory.findOneAndUpdate(
        { hospital: req.apiHospitalId, bloodGroup },
        { $set: { units, expiresAt: expiresAt || undefined, lastUpdatedBy: 'api' } },
        { upsert: true, runValidators: true }
      );

      results.push({ bloodGroup, units, status: 'synced' });
    }

    res.json({ success: true, message: 'Sync complete.', data: { results } });
  } catch (err) {
    next(err);
  }
});

/* ─── Code Red broadcast ────────────────────────────────────────────────────── */

/**
 * POST /api/hospitals/broadcast
 *
 * Issues a Code Red alert on a specific inventory entry.
 * The broadcast expires after 6 hours.  Frontend polls /me and displays
 * the active broadcast prominently.  Phase 6 will wire this to push notifications.
 *
 * Body: { inventoryId, message }
 */
router.post(
  '/broadcast',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      if (req.org.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Your organisation must be approved to issue broadcasts.',
        });
      }

      const { inventoryId, message } = req.body;
      if (!inventoryId) {
        return res.status(400).json({ success: false, message: 'inventoryId is required.' });
      }
      if (!mongoose.isValidObjectId(inventoryId)) {
        return res.status(400).json({ success: false, message: 'Invalid inventoryId.' });
      }

      const inv = await Inventory.findOne({ _id: inventoryId, hospital: req.org._id });
      if (!inv) {
        return res.status(404).json({ success: false, message: 'Inventory record not found.' });
      }

      const now = new Date();
      inv.codeRed = {
        active:    true,
        message:   message || `Urgent: ${inv.bloodGroup} blood needed at ${req.org.name}`,
        issuedAt:  now,
        expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000), // +6 hours
      };

      await inv.save();

      res.json({
        success: true,
        message: 'Code Red broadcast issued. It will auto-expire in 6 hours.',
        data: { inventory: inv },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/hospitals/broadcast/:invId
 *
 * Manually cancel an active Code Red before it expires.
 */
router.delete(
  '/broadcast/:invId',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.invId)) {
        return res.status(400).json({ success: false, message: 'Invalid inventory ID.' });
      }

      const inv = await Inventory.findOne({ _id: req.params.invId, hospital: req.org._id });
      if (!inv) {
        return res.status(404).json({ success: false, message: 'Inventory record not found.' });
      }

      inv.codeRed = { active: false };
      await inv.save();

      res.json({ success: true, message: 'Code Red broadcast cancelled.' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/hospitals/requests
 * Hospital staff views incoming blood requests submitted at their hospital.
 */
router.get(
  '/requests',
  requireAuth,
  requireRole(['hospital']),
  requireOrg,
  async (req, res, next) => {
    try {
      const { Request } = require('../../models/Request');
      const requests = await Request.find({
        $or: [
          { hospital: req.org._id },
          { hospitalName: { $regex: req.org.name, $options: 'i' } }
        ]
      })
        .populate('seeker', 'name email phone')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/hospitals/verify-qr
 * Hospital staff scans donor QR code or inputs token manually at counter.
 */
router.post(
  '/verify-qr',
  requireAuth,
  requireRole(['hospital', 'admin']),
  requireOrg,
  async (req, res, next) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token or QR string is required.' });
      }

      // Extract raw token if full URL was scanned
      let cleanToken = String(token).trim();
      if (cleanToken.includes('/qr/verify/')) {
        cleanToken = cleanToken.split('/qr/verify/').pop().trim();
      }

      const { DonationToken } = require('../../models/DonationToken');
      const { Request }       = require('../../models/Request');
      const { User }          = require('../../models/User');
      const { DonorProfile }  = require('../../models/DonorProfile');
      const { notifyUser }    = require('../../utils/webPush');

      const donationToken = await DonationToken.findOne({
        token: new RegExp('^' + cleanToken + '$', 'i')
      }).populate('requestId donorId');
      if (!donationToken) {
        return res.status(404).json({ success: false, message: 'Invalid or expired QR token.' });
      }

      if (donationToken.usedAt) {
        return res.status(409).json({ success: false, message: 'This QR token was already verified previously.' });
      }

      if (new Date() > donationToken.expiresAt) {
        return res.status(410).json({ success: false, message: 'This QR token has expired. Ask donor to regenerate.' });
      }

      const bloodRequest = donationToken.requestId;
      const donor        = donationToken.donorId;

      if (!bloodRequest) {
        return res.status(404).json({ success: false, message: 'Associated blood request not found.' });
      }

      // Hospital Location & Identity Verification:
      // Verify that the scanned QR token belongs to a blood request intended for THIS hospital/clinic
      if (req.org && req.user.role !== 'admin') {
        const counterHospitalId = String(req.org._id || req.org.id || '');
        const requestHospitalId = String(bloodRequest.hospital || '');
        const counterHospitalName = (req.org.name || '').trim().toLowerCase();
        const requestHospitalName = (bloodRequest.hospitalName || '').trim().toLowerCase();

        const matchById = counterHospitalId && requestHospitalId && counterHospitalId === requestHospitalId;
        const matchByName = counterHospitalName && requestHospitalName && (
          counterHospitalName.includes(requestHospitalName) || requestHospitalName.includes(counterHospitalName)
        );

        if (!matchById && !matchByName) {
          return res.status(403).json({
            success: false,
            message: `Hospital Location Mismatch! This QR token is for a blood request at "${bloodRequest.hospitalName}" (${bloodRequest.hospitalCity || 'specified location'}). It cannot be verified or fulfilled at ${req.org.name}.`,
          });
        }
      }

      donationToken.usedAt     = new Date();
      donationToken.verifiedBy = req.user.id;
      await donationToken.save();

      bloodRequest.status      = 'fulfilled';
      bloodRequest.fulfilledAt = new Date();
      bloodRequest.fulfilledBy = donor._id;
      await bloodRequest.save();

      await User.findByIdAndUpdate(donor._id, { $inc: { donationCount: 1 } });
      await DonorProfile.findOneAndUpdate(
        { user: donor._id },
        { $inc: { confirmedDonations: 1 }, lastDonationDate: new Date() },
        { upsert: true }
      );

      // Notify Seeker
      await notifyUser({
        userId:  bloodRequest.seeker,
        type:    'request_fulfilled',
        title:   '🩸 Donation Confirmed & Request Fulfilled!',
        message: `Donor ${donor.name} has arrived at ${bloodRequest.hospitalName} and completed donation of ${bloodRequest.patientBloodGroup} blood.`,
        link:    '/dashboard/seeker',
      }).catch(() => {});

      // Notify Donor
      await notifyUser({
        userId:  donor._id,
        type:    'donation_confirmed',
        title:   '✅ Donation Confirmed — Thank You!',
        message: `Your donation for ${bloodRequest.patientBloodGroup} blood at ${bloodRequest.hospitalName} has been verified by the counter staff.`,
        link:    '/dashboard/donor',
      }).catch(() => {});

      res.json({
        success: true,
        message: `Donation verified! Request for ${bloodRequest.patientBloodGroup} blood marked as fulfilled.`,
        data: {
          requestId:  bloodRequest._id,
          donorName:  donor.name,
          bloodGroup: bloodRequest.patientBloodGroup,
          hospital:   bloodRequest.hospitalName,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
