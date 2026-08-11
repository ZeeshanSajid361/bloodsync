/**
 * Blood-group compatibility matrix.
 *
 * Defines which donor blood groups a patient of a given group can safely
 * receive (ABO + Rh compatibility rules for whole blood).
 *
 * Reference: WHO/AABB whole-blood compatibility guidelines.
 *
 * Used by:
 *   - GET /api/search  → translates the patient's blood group into a list of
 *     acceptable donor groups before querying DonorProfile.
 *   - Seeker dashboard → drives the "compatible donors" search UI.
 *
 * Pure functions, no side effects — trivially unit-testable.
 */

'use strict';

/**
 * Maps a patient (recipient) blood group to all donor blood groups that are
 * safe for that patient to receive.
 *
 * @type {Record<string, string[]>}
 */
const COMPATIBLE_DONORS = {
  'O-':  ['O-'],
  'O+':  ['O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // universal recipient
};

/**
 * Returns the list of donor blood groups compatible with the given patient group.
 * Returns an empty array for an unrecognised blood group instead of throwing,
 * so callers can handle it as a validation error.
 *
 * @param {string} patientBloodGroup
 * @returns {string[]}
 */
function getCompatibleDonorGroups(patientBloodGroup) {
  return COMPATIBLE_DONORS[patientBloodGroup] ?? [];
}

/**
 * Returns true if the given donor group is compatible with the given patient group.
 *
 * @param {string} patientBloodGroup
 * @param {string} donorBloodGroup
 * @returns {boolean}
 */
function isCompatible(patientBloodGroup, donorBloodGroup) {
  return getCompatibleDonorGroups(patientBloodGroup).includes(donorBloodGroup);
}

/**
 * Returns a summary of who can donate to whom — useful for the "Who can I receive
 * from?" info card on the seeker dashboard.
 *
 * @param {string} patientBloodGroup
 * @returns {{ compatibleDonors: string[], isUniversalRecipient: boolean }}
 */
function getCompatibilitySummary(patientBloodGroup) {
  const compatibleDonors = getCompatibleDonorGroups(patientBloodGroup);
  return {
    compatibleDonors,
    isUniversalRecipient: compatibleDonors.length === 8,
    isUniversalDonor:     patientBloodGroup === 'O-',
  };
}

const ALL_BLOOD_GROUPS = Object.keys(COMPATIBLE_DONORS);

module.exports = { COMPATIBLE_DONORS, getCompatibleDonorGroups, isCompatible, getCompatibilitySummary, ALL_BLOOD_GROUPS };
