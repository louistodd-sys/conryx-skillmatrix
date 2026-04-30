/**
 * Utilities for computing "current" (latest) assessments from a list.
 *
 * The key convention across the codebase is: `${userId}-${skillId}`
 * An assessment is considered "current" when it is the most-recently-assessed
 * record for a given user+skill pair (sorted by assessed_date).
 */

/**
 * Returns a map of the latest assessment per user+skill pair.
 *
 * @param {Array} assessments - array of SkillAssessment records
 * @returns {Object} - { [userId-skillId]: assessment }
 */
export function getLatestAssessments(assessments) {
  const map = {};
  const sorted = [...assessments].sort((a, b) =>
    (a.assessed_date || '').localeCompare(b.assessed_date || '')
  );
  for (const a of sorted) {
    map[`${a.user_id}-${a.skill_id}`] = a;
  }
  return map;
}

/**
 * Returns the latest assessment for a specific user across all their skill records.
 * Same logic as getLatestAssessments but scoped to a single userId.
 *
 * @param {Array}  assessments - array of SkillAssessment records
 * @param {string} userId
 * @returns {Object} - { [skillId]: assessment }
 */
export function getLatestAssessmentsForUser(assessments, userId) {
  const relevant = assessments.filter(a => a.user_id === userId);
  const map = {};
  const sorted = [...relevant].sort((a, b) =>
    (a.assessed_date || '').localeCompare(b.assessed_date || '')
  );
  for (const a of sorted) {
    map[a.skill_id] = a;
  }
  return map;
}