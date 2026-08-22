/**
 * Auth Module Routes — Delegates requests to AuthController.
 */

'use strict';

const express = require('express');
const authController = require('./authController');
const { requireAuth } = require('#middleware/auth');

const router = express.Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
router.post('/resend-verification', (req, res, next) => authController.forgotPassword(req, res, next)); // alias
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));
router.post('/contact', (req, res, next) => authController.contact(req, res, next));

router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));
router.put('/me', requireAuth, (req, res, next) => authController.updateMe(req, res, next));

module.exports = router;
