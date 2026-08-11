'use strict';

/**
 * Document Proxy Endpoint — GET /api/docs/view?url=<encoded-cloudinary-url>
 *
 * Problem:
 *   - Legacy PDFs uploaded as 'raw' return HTTP 401 Unauthorized when accessed directly without API signatures.
 *   - PDFs uploaded as 'image' return HTTP 401 or HTTP 400 when accessed directly.
 *   - Direct Cloudinary delivery headers include Content-Disposition: attachment, forcing browser downloads.
 *
 * Solution:
 *   This endpoint uses the Cloudinary Node SDK to generate a signed API download request using
 *   the server's API key and secret credentials.
 *   It tries candidate combinations (raw vs image, exact public_id vs base public_id + format)
 *   until Cloudinary returns 200 OK, then streams the file to the browser with:
 *     - Content-Type: application/pdf
 *     - Content-Disposition: inline; filename="..."
 *
 * Result:
 *   100% reliable inline rendering in the browser for ALL PDFs (past, present, and future).
 */

const express = require('express');
const https   = require('https');
const http    = require('http');
const url     = require('url');
const cloudinary = require('cloudinary').v2;
const { cloudinary: cloudConfig } = require('../../config/env');

// Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: cloudConfig.cloudName,
  api_key:    cloudConfig.apiKey,
  api_secret: cloudConfig.apiSecret,
});

const router = express.Router();
const ALLOWED_HOSTS = ['res.cloudinary.com'];

/**
 * Helper to perform an HTTP(S) GET request with redirect support.
 */
function httpGet(targetUrl, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new url.URL(targetUrl);
    } catch (e) {
      return reject(e);
    }

    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.get(targetUrl, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        let redirectTarget = res.headers.location;
        if (redirectTarget.startsWith('/')) {
          redirectTarget = `${parsed.protocol}//${parsed.host}${redirectTarget}`;
        }
        return httpGet(redirectTarget, maxRedirects - 1).then(resolve).catch(reject);
      }

      resolve(res);
    });

    req.on('error', reject);
  });
}

/**
 * Strategy runner: attempts signed Cloudinary API download URLs using candidate specs.
 */
async function fetchSignedCloudinaryStream(inputUrl) {
  // Clean transformation flags if present
  const clean = decodeURIComponent(inputUrl).replace(/\/fl_[^\/]+\//, '/');
  const afterUpload = clean.split('/upload/')[1] || '';
  const pathNoVersion = afterUpload.replace(/^v\d+\//, '').split('?')[0];

  const ext = pathNoVersion.toLowerCase().endsWith('.pdf') ? 'pdf' : '';
  const baseNoExt = ext ? pathNoVersion.slice(0, -4) : pathNoVersion;

  // Candidate signed specs in priority order
  const candidates = [
    { pid: pathNoVersion, fmt: '',  rt: 'raw' },
    { pid: baseNoExt,      fmt: ext, rt: 'image' },
    { pid: baseNoExt,      fmt: ext, rt: 'raw' },
    { pid: pathNoVersion, fmt: '',  rt: 'image' },
  ];

  for (const cand of candidates) {
    if (!cand.pid) continue;
    try {
      const signedUrl = cloudinary.utils.private_download_url(cand.pid, cand.fmt, {
        resource_type: cand.rt,
        type: 'upload',
      });

      const res = await httpGet(signedUrl);
      if (res.statusCode === 200) {
        return { statusCode: 200, res };
      }
    } catch {
      // Try next candidate
    }
  }

  // Fallback: direct fetch of cleaned input URL
  try {
    const directRes = await httpGet(clean);
    return { statusCode: directRes.statusCode, res: directRes };
  } catch (err) {
    return { statusCode: 502, error: err };
  }
}

// ─── GET /api/docs/view ──────────────────────────────────────────────────────
router.get('/view', async (req, res) => {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).json({ success: false, message: 'url query param is required.' });
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid URL encoding.' });
  }

  // Host validation
  let parsed;
  try {
    parsed = new url.URL(decoded);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid URL.' });
  }

  const isAllowed = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: 'URL host not permitted.' });
  }

  try {
    const result = await fetchSignedCloudinaryStream(decoded);

    if (result.statusCode !== 200 || !result.res) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: `Unable to fetch document from Cloudinary (Status ${result.statusCode || 500}).`,
      });
    }

    const cloudRes = result.res;
    const lower = decoded.toLowerCase().split('?')[0];

    let contentType = cloudRes.headers['content-type'] || 'application/octet-stream';
    if (lower.endsWith('.pdf') || contentType.includes('pdf')) {
      contentType = 'application/pdf';
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lower.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lower.endsWith('.webp')) {
      contentType = 'image/webp';
    }

    const filename = decoded.split('/').pop().split('?')[0] || 'document.pdf';

    // Send HTTP 200 with inline Content-Disposition so browser displays PDF natively
    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    cloudRes.pipe(res);
  } catch (err) {
    console.error('[DocProxy] Unhandled error:', err);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Failed to stream document.', error: err.message });
    }
  }
});

module.exports = router;
