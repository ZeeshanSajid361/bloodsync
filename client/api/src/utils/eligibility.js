/**
 * Eligibility engine — WHO-standard, gender-aware cooldown.
 *
 * Design decisions:
 *   - Computed on every read rather than stored as a boolean, so there is
 *     no stale state and no cron job needed for the MVP.
 *   - Pure functions with no side effects — trivially unit-testable with Jest.
 *   - `gender === 'other'` uses the more conservative female cooldown (120 days)
 *     to err on the side of donor safety.
 *
 * WHO reference values:
 *   Male   — minimum 90 days (12 weeks) between whole-blood donations
 *   Female — minimum 120 days (16 weeks) between whole-blood donations
 */

'use strict';

const COOLDOWN_DAYS = {
  male:   90,
  female: 120,
  other:  120, // conservative fallback
};

/**
 * Calculates whether a donor is currently eligible to donate.
 *
 * @param {string}    gender           - 'male' | 'female' | 'other'
 * @param {Date|null} lastDonationDate - Date of last confirmed donation, or null
 * @returns {{ eligible: boolean, nextEligibleDate: Date|null, daysUntilEligible: number }}
 */
function getEligibility(gender, lastDonationDate) {
  if (!lastDonationDate) {
    return { eligible: true, nextEligibleDate: null, daysUntilEligible: 0 };
  }

  const cooldown = COOLDOWN_DAYS[gender] ?? COOLDOWN_DAYS.male;

  const nextEligibleDate = new Date(lastDonationDate);
  nextEligibleDate.setDate(nextEligibleDate.getDate() + cooldown);

  const now = new Date();
  const eligible = now >= nextEligibleDate;

  let daysUntilEligible = 0;
  if (!eligible) {
    const msRemaining = nextEligibleDate.getTime() - now.getTime();
    daysUntilEligible = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  }

  return { eligible, nextEligibleDate, daysUntilEligible };
}

/**
 * Returns true only if the donor is both medically eligible AND has marked
 * themselves available. This is the single gate used by search and alerts.
 *
 * @param {string}    gender
 * @param {Date|null} lastDonationDate
 * @param {boolean}   isAvailable
 * @returns {boolean}
 */
function canDonate(gender, lastDonationDate, isAvailable) {
  if (!isAvailable) return false;
  return getEligibility(gender, lastDonationDate).eligible;
}

module.exports = { getEligibility, canDonate, COOLDOWN_DAYS };
