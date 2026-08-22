/**
 * Donor Module Routes — Maps donor endpoints to DonorController handlers.
 */

'use strict';

const express = require('express');
const donorController = require('./donorController');
const { requireAuth, requireRole } = require('#middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole(['donor']));

router.get('/me', (req, res, next) => donorController.getMe(req, res, next));
router.put('/me', (req, res, next) => donorController.updateMe(req, res, next));
router.patch('/me/availability', (req, res, next) => donorController.toggleAvailability(req, res, next));
router.get('/search', (req, res, next) => donorController.searchDonors(req, res, next));
router.get('/requests', (req, res, next) => donorController.getRequests(req, res, next));
router.post('/requests/:id/commit', (req, res, next) => donorController.commitToRequest(req, res, next));
router.delete('/requests/:id/commit', (req, res, next) => donorController.cancelCommitment(req, res, next));

module.exports = router;
