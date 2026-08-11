/**
 * JWT utility — access and refresh token lifecycle.
 *
 * Access tokens are short-lived (15 min) and carry the minimum payload needed
 * for RBAC middleware to work without a DB hit. Refresh tokens are long-lived
 * (7 days), stored as a SHA-256 hash on the User document, and rotated on
 * every successful refresh to limit the blast radius of a stolen token.
 */

'use strict';

const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

/**
 * Signs and returns a new access token.
 *
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
function signAccessToken(payload) {
  return jwt.sign(
    { sub: payload.id, role: payload.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

/**
 * Signs and returns a new refresh token.
 * The raw token is returned for hashing and storage on the User document.
 *
 * @param {{ id: string }} payload
 * @returns {string}
 */
function signRefreshToken(payload) {
  return jwt.sign(
    { sub: payload.id },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
}

/**
 * Verifies an access token and returns its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 *
 * @param {string} token
 * @returns {{ sub: string, role: string, iat: number, exp: number }}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, jwtConfig.accessSecret);
}

/**
 * Verifies a refresh token and returns its decoded payload.
 *
 * @param {string} token
 * @returns {{ sub: string, iat: number, exp: number }}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, jwtConfig.refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
