/**
 * Authentication & RBAC middleware.
 *
 * requireAuth   — verifies the access token in the Authorization header and
 *                 attaches { id, role } to req.user. Returns 401 on any failure
 *                 so the client knows to attempt a token refresh.
 *
 * requireRole   — factory that returns a middleware accepting only specific
 *                 roles. Must be used after requireAuth in the middleware chain.
 */

'use strict';

const { verifyAccessToken } = require('../utils/token');

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Populates req.user with { id, role } on success.
 *
 * @type {import('express').RequestHandler}
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No access token provided. Please log in.',
    });
  }

  const token = authHeader.slice(7); // remove "Bearer " prefix

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'Access token has expired. Please refresh your session.'
        : 'Invalid access token.',
      code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
}

/**
 * Returns a middleware that allows only the specified roles through.
 * Must be placed after requireAuth in the route definition.
 *
 * Usage: router.get('/admin-only', requireAuth, requireRole(['admin']), handler)
 *
 * @param {string[]} roles — subset of ['donor', 'seeker', 'hospital', 'admin']
 * @returns {import('express').RequestHandler}
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      // Guard against being called without requireAuth — shouldn't happen in
      // correct middleware chains, but surface it clearly rather than crashing.
      return res.status(500).json({
        success: false,
        message: 'requireRole must be used after requireAuth.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route requires one of: ${roles.join(', ')}.`,
      });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
