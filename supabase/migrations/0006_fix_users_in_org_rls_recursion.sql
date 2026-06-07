-- =============================================================================
-- 0006_fix_users_in_org_rls_recursion.sql
-- The "users_in_org" policy on public.users contained a subquery that queried
-- public.users, causing infinite recursion and HTTP 500 errors on every
-- profile fetch after sign-in.
--
-- Fix: replace the inline subquery with a SECURITY DEFINER function that
-- runs as the function owner (bypassing RLS), breaking the recursion.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_organisation_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id FROM public.users WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "users_in_org" ON public.users;

CREATE POLICY "users_in_org" ON public.users
  FOR SELECT
  USING (organisation_id = public.current_user_organisation_id());
