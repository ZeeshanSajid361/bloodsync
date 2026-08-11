/**
 * Jest unit tests — eligibility engine.
 *
 * Run with: npm test (from server/)
 *
 * These tests exercise the pure eligibility logic in isolation — no DB,
 * no HTTP, no external dependencies. They serve as a regression safety net
 * if the cooldown rules or gender handling ever need to change.
 */

'use strict';

const { getEligibility, canDonate, COOLDOWN_DAYS } = require('../utils/eligibility');

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── getEligibility ────────────────────────────────────────────────────────────
describe('getEligibility()', () => {
  test('returns eligible=true when lastDonationDate is null (first-time donor)', () => {
    const result = getEligibility('male', null);
    expect(result.eligible).toBe(true);
    expect(result.nextEligibleDate).toBeNull();
    expect(result.daysUntilEligible).toBe(0);
  });

  test('male donor is eligible after 90 days', () => {
    const result = getEligibility('male', daysAgo(90));
    expect(result.eligible).toBe(true);
    expect(result.daysUntilEligible).toBe(0);
  });

  test('male donor is NOT eligible before 90 days (e.g. 89 days ago)', () => {
    const result = getEligibility('male', daysAgo(89));
    expect(result.eligible).toBe(false);
    expect(result.daysUntilEligible).toBeGreaterThan(0);
    expect(result.nextEligibleDate).toBeInstanceOf(Date);
  });

  test('female donor is eligible after 120 days', () => {
    const result = getEligibility('female', daysAgo(120));
    expect(result.eligible).toBe(true);
  });

  test('female donor is NOT eligible at 119 days', () => {
    const result = getEligibility('female', daysAgo(119));
    expect(result.eligible).toBe(false);
    expect(result.daysUntilEligible).toBeGreaterThanOrEqual(1);
  });

  test('gender=other uses the female (120-day) cooldown', () => {
    // At 115 days: would be eligible under male rules (90), not under female/other (120)
    const result = getEligibility('other', daysAgo(115));
    expect(result.eligible).toBe(false);
  });

  test('daysUntilEligible is approximately correct for a 1-day-ago donation', () => {
    const result = getEligibility('male', daysAgo(1));
    expect(result.daysUntilEligible).toBeCloseTo(COOLDOWN_DAYS.male - 1, 0);
  });
});

// ── canDonate ─────────────────────────────────────────────────────────────────
describe('canDonate()', () => {
  test('returns false when donor is unavailable even if medically eligible', () => {
    expect(canDonate('male', null, false)).toBe(false);
  });

  test('returns true when eligible AND available', () => {
    expect(canDonate('male', null, true)).toBe(true);
  });

  test('returns false when available but cooldown not elapsed', () => {
    expect(canDonate('male', daysAgo(30), true)).toBe(false);
  });
});
