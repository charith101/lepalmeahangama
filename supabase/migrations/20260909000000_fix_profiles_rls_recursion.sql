-- Fix infinite RLS recursion on profiles
-- Root cause: the "read profiles" SELECT policy was `get_staff_role() IS NOT NULL`,
-- and get_staff_role() (SECURITY INVOKER) itself SELECTs from profiles. Evaluating
-- the policy re-enters profiles -> recursion -> Postgres aborts with
-- "infinite recursion detected in policy for relation profiles". Every dashboard
-- page queries profiles, so the layout got profile=NULL and redirected to
-- /auth/login, while the proxy redirected the authenticated user back to
-- /dashboard -> infinite redirect loop.
--
-- Fix: users read only their own profile row (non-recursive). get_staff_role()
-- can then read the caller's own row and keep powering every other table's
-- staff-only policies.

DROP POLICY IF EXISTS "read profiles" ON public.profiles;

CREATE POLICY "read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- get_staff_role is used by RLS policies across the schema; restrict callers to
-- staff (authenticated). Revoke PUBLIC first so anon can't call it directly.
REVOKE EXECUTE ON FUNCTION public.get_staff_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_staff_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_staff_role() TO authenticated;