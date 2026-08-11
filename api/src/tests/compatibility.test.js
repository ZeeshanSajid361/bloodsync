/**
 * Jest unit tests — blood-group compatibility matrix.
 *
 * Run with: npm test (from server/)
 *
 * Tests cover all 8 blood groups, both compatibility directions, and
 * the edge cases (universal donor O-, universal recipient AB+).
 */

'use strict';

const {
  getCompatibleDonorGroups,
  isCompatible,
  getCompatibilitySummary,
  ALL_BLOOD_GROUPS,
} = require('../utils/compatibility');

// ── getCompatibleDonorGroups ───────────────────────────────────────────────
describe('getCompatibleDonorGroups()', () => {
  test('O- can only receive from O-', () => {
    expect(getCompatibleDonorGroups('O-')).toEqual(['O-']);
  });

  test('O+ can receive from O+ and O-', () => {
    expect(getCompatibleDonorGroups('O+')).toEqual(expect.arrayContaining(['O+', 'O-']));
    expect(getCompatibleDonorGroups('O+')).toHaveLength(2);
  });

  test('A+ can receive from A+, A-, O+, O-', () => {
    const groups = getCompatibleDonorGroups('A+');
    expect(groups).toEqual(expect.arrayContaining(['A+', 'A-', 'O+', 'O-']));
    expect(groups).toHaveLength(4);
  });

  test('B+ can receive from B+, B-, O+, O-', () => {
    const groups = getCompatibleDonorGroups('B+');
    expect(groups).toEqual(expect.arrayContaining(['B+', 'B-', 'O+', 'O-']));
    expect(groups).toHaveLength(4);
  });

  test('AB+ is a universal recipient — can receive from all 8 groups', () => {
    expect(getCompatibleDonorGroups('AB+')).toHaveLength(8);
    expect(getCompatibleDonorGroups('AB+')).toEqual(
      expect.arrayContaining(ALL_BLOOD_GROUPS)
    );
  });

  test('AB- can receive from AB-, A-, B-, O- (Rh-negative sources only)', () => {
    const groups = getCompatibleDonorGroups('AB-');
    expect(groups).toEqual(expect.arrayContaining(['AB-', 'A-', 'B-', 'O-']));
    expect(groups).toHaveLength(4);
  });

  test('returns empty array for an unknown blood group', () => {
    expect(getCompatibleDonorGroups('X+')).toEqual([]);
  });
});

// ── isCompatible ───────────────────────────────────────────────────────────
describe('isCompatible()', () => {
  test('O- donor is compatible with O- patient', () => {
    expect(isCompatible('O-', 'O-')).toBe(true);
  });

  test('O- donor is NOT compatible with O+ patient if Rh is crossed', () => {
    // O- patient can only receive O- (Rh negative)
    expect(isCompatible('O-', 'O+')).toBe(false);
  });

  test('O- is compatible with any patient (universal donor check)', () => {
    // Every patient blood group should accept O-
    ALL_BLOOD_GROUPS.forEach((patientGroup) => {
      expect(isCompatible(patientGroup, 'O-')).toBe(true);
    });
  });

  test('AB+ patient is compatible with all donor groups', () => {
    ALL_BLOOD_GROUPS.forEach((donorGroup) => {
      expect(isCompatible('AB+', donorGroup)).toBe(true);
    });
  });

  test('A+ donor is NOT compatible with B+ patient', () => {
    expect(isCompatible('B+', 'A+')).toBe(false);
  });
});

// ── getCompatibilitySummary ────────────────────────────────────────────────
describe('getCompatibilitySummary()', () => {
  test('AB+ is flagged as universal recipient', () => {
    const summary = getCompatibilitySummary('AB+');
    expect(summary.isUniversalRecipient).toBe(true);
  });

  test('O- is flagged as universal donor group', () => {
    const summary = getCompatibilitySummary('O-');
    expect(summary.isUniversalDonor).toBe(true);
  });

  test('A+ is neither universal donor nor universal recipient', () => {
    const summary = getCompatibilitySummary('A+');
    expect(summary.isUniversalRecipient).toBe(false);
    expect(summary.isUniversalDonor).toBe(false);
  });
});
