-- =============================================================================
-- 0007_managed_members_support.sql
--
-- The managed-employee feature (AddEmployeeModal) generates a random UUID for
-- each employee and stores it in team_members.user_id and
-- skill_assessments.user_id.  The existing FK constraints on those columns
-- reference public.users(id), which only holds auth-backed users, so every
-- managed-employee insert fails with a foreign-key violation.
--
-- Fix: drop the FK constraints so the columns can hold any UUID — whether a
-- real auth user or a generated managed-employee identifier.
-- The NOT NULL constraint is intentionally kept; is_managed_member=true is
-- the discriminator for managed employees.
-- RLS remains unchanged: all rows are still scoped by organisation_id.
-- =============================================================================

ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

ALTER TABLE skill_assessments
  DROP CONSTRAINT IF EXISTS skill_assessments_user_id_fkey;
