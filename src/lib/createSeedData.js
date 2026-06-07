import { apiClient } from '@/api/apiClient';
import { format, addDays } from 'date-fns';

export const EXAMPLE_MEMBER_NAME = 'Example Employee';
export const EXAMPLE_MEMBER_KEY = (orgId) => `example_member_id_${orgId}`;

/**
 * Populates a freshly-created org with an Example Employee and sample
 * assessments so the user can see the app fully populated on first login.
 *
 * Safe to call without awaiting — errors are caught internally.
 */
export async function createSeedData(orgId, userId) {
  try {
    // ── 1. Resolve team ──────────────────────────────────────────────────────
    const teams = await apiClient.entities.Team.filter({ organisation_id: orgId });
    let teamId;
    if (teams.length > 0) {
      teamId = teams[0].id;
    } else {
      const team = await apiClient.entities.Team.create({
        organisation_id: orgId,
        name: 'Example Team',
        manager_ids: userId ? [userId] : [],
      });
      teamId = team.id;
    }

    // ── 2. Resolve skills (use existing or create defaults) ──────────────────
    let skills = await apiClient.entities.Skill.filter({ organisation_id: orgId, status: 'active' });

    if (skills.length === 0) {
      const cat = await apiClient.entities.SkillCategory.create({
        organisation_id: orgId,
        name: 'General Skills',
        colour: '#6366f1',
      });
      skills = await apiClient.entities.Skill.bulkCreate([
        {
          organisation_id: orgId,
          category_id: cat.id,
          name: 'Health & Safety Awareness',
          scale_type: 'binary',
          requires_expiry: true,
          expiry_warning_days: [30, 60],
          status: 'active',
        },
        {
          organisation_id: orgId,
          category_id: cat.id,
          name: 'Manual Handling',
          scale_type: 'binary',
          requires_expiry: true,
          expiry_warning_days: [30, 60],
          status: 'active',
        },
        {
          organisation_id: orgId,
          category_id: cat.id,
          name: 'Fire Safety',
          scale_type: 'binary',
          requires_expiry: false,
          expiry_warning_days: [],
          status: 'active',
        },
      ]);
    }

    // De-duplicate and take first 3
    const uniqueSkills = [...new Map(skills.map(s => [s.id, s])).values()].slice(0, 3);

    // ── 3. Create Example Employee managed member ────────────────────────────
    const memberId = crypto.randomUUID();
    await apiClient.entities.TeamMember.create({
      organisation_id: orgId,
      team_id: teamId,
      user_id: memberId,
      user_name: EXAMPLE_MEMBER_NAME,
      user_email: null,
      is_managed_member: true,
      member_id: memberId,
    });

    // ── 4. Set required skills for the team ─────────────────────────────────
    const existingReqs = await apiClient.entities.TeamRequiredSkill.filter({ team_id: teamId });
    const existingSkillIds = new Set(existingReqs.map(r => r.skill_id));

    for (const skill of uniqueSkills) {
      if (!existingSkillIds.has(skill.id)) {
        await apiClient.entities.TeamRequiredSkill.create({
          organisation_id: orgId,
          team_id: teamId,
          skill_id: skill.id,
          is_required: true,
          minimum_proficiency: 1,
        });
      }
    }

    // ── 5. Create assessments with varied RAG statuses ───────────────────────
    //   skill[0] → GREEN  (competent, expiry 6 months away)
    //   skill[1] → AMBER  (competent, expiry 20 days — within 60-day warning)
    //   skill[2] → RED    (no assessment = gap on required skill)
    const today = format(new Date(), 'yyyy-MM-dd');
    const assessments = [];

    if (uniqueSkills[0]) {
      assessments.push({
        organisation_id: orgId,
        user_id: memberId,
        user_name: EXAMPLE_MEMBER_NAME,
        skill_id: uniqueSkills[0].id,
        skill_name: uniqueSkills[0].name,
        proficiency_level: 1,
        assessed_date: today,
        expiry_date: format(addDays(new Date(), 180), 'yyyy-MM-dd'),
        notes: 'Example data',
        assessed_by_user_id: userId || null,
        assessed_by_name: 'Admin',
      });
    }

    if (uniqueSkills[1]) {
      assessments.push({
        organisation_id: orgId,
        user_id: memberId,
        user_name: EXAMPLE_MEMBER_NAME,
        skill_id: uniqueSkills[1].id,
        skill_name: uniqueSkills[1].name,
        proficiency_level: 1,
        assessed_date: today,
        expiry_date: format(addDays(new Date(), 20), 'yyyy-MM-dd'),
        notes: 'Example data — due for renewal',
        assessed_by_user_id: userId || null,
        assessed_by_name: 'Admin',
      });
    }

    // skill[2] intentionally left unassessed — shows as RED gap

    if (assessments.length > 0) {
      await apiClient.entities.SkillAssessment.bulkCreate(assessments);
    }

    // Store memberId so the welcome tour can offer a one-click delete
    try {
      localStorage.setItem(EXAMPLE_MEMBER_KEY(orgId), memberId);
    } catch {}

    return memberId;
  } catch (err) {
    console.warn('Seed data creation failed (non-fatal):', err);
    return null;
  }
}

/**
 * Removes all Example Employee data (TeamMember + SkillAssessments).
 * Returns true on success.
 */
export async function removeSeedData(orgId) {
  const memberId = localStorage.getItem(EXAMPLE_MEMBER_KEY(orgId));
  if (!memberId) return false;

  const members = await apiClient.entities.TeamMember.filter({
    organisation_id: orgId,
    user_id: memberId,
  });
  for (const m of members) {
    await apiClient.entities.TeamMember.delete(m.id);
  }

  const assessments = await apiClient.entities.SkillAssessment.filter({
    organisation_id: orgId,
    user_id: memberId,
  });
  for (const a of assessments) {
    await apiClient.entities.SkillAssessment.delete(a.id);
  }

  localStorage.removeItem(EXAMPLE_MEMBER_KEY(orgId));
  return true;
}
