/**
 * Donor recognition levels.
 *
 * Tier thresholds and display metadata are defined in one place so that
 * any future changes (adding a tier, tweaking a threshold) touch only this
 * file. The badge data is used by both the API response and the frontend.
 *
 * Borrowed directly from the Blood Link Pakistan gamification model —
 * purely cosmetic, costs nothing but a lookup at read time.
 */

'use strict';

/**
 * Ordered from lowest to highest. The last entry whose `minDonations` is
 * ≤ confirmedDonations wins.
 */
const LEVELS = [
  {
    id:           'spark',
    label:        'Spark',
    minDonations: 1,
    icon:         '✨',
    color:        '#f59e0b',
    description:  'Your first confirmed donation. Every life saved starts here.',
  },
  {
    id:           'pulse',
    label:        'Pulse',
    minDonations: 3,
    icon:         '💓',
    color:        '#f97316',
    description:  '3 confirmed donations. You are becoming a regular lifesaver.',
  },
  {
    id:           'life_saver',
    label:        'Life Saver',
    minDonations: 7,
    icon:         '🩸',
    color:        '#e62222',
    description:  '7 confirmed donations. You have saved multiple lives.',
  },
  {
    id:           'guardian',
    label:        'Guardian',
    minDonations: 12,
    icon:         '🛡️',
    color:        '#1565c0',
    description:  '12 confirmed donations. A true guardian of the blood supply.',
  },
  {
    id:           'anchor',
    label:        'Anchor',
    minDonations: 20,
    icon:         '⚓',
    color:        '#7c3aed',
    description:  '20+ confirmed donations. The community\'s most trusted donor.',
  },
];

/**
 * Returns the donor's current recognition level, or null if they have no
 * confirmed donations yet.
 *
 * @param {number} confirmedDonations
 * @returns {{ id, label, icon, color, description, minDonations, nextLevel } | null}
 */
function getDonorLevel(confirmedDonations) {
  if (confirmedDonations < 1) return null;

  let current = null;
  for (const level of LEVELS) {
    if (confirmedDonations >= level.minDonations) {
      current = level;
    }
  }

  // Find the next tier above the current one for progress display.
  const currentIndex = LEVELS.indexOf(current);
  const nextLevel    = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

  return { ...current, nextLevel };
}

/**
 * Returns the fraction of progress toward the next level (0–1).
 * Returns 1 if the donor is already at the highest tier.
 *
 * @param {number} confirmedDonations
 * @returns {number}
 */
function getLevelProgress(confirmedDonations) {
  const level = getDonorLevel(confirmedDonations);
  if (!level) return 0;
  if (!level.nextLevel) return 1;

  const earned   = confirmedDonations - level.minDonations;
  const required = level.nextLevel.minDonations - level.minDonations;
  return Math.min(earned / required, 1);
}

module.exports = { getDonorLevel, getLevelProgress, LEVELS };
