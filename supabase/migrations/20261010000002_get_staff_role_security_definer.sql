-- FIX: RLS recursion while testing "Mark Room Clean" (2026-10-10).
--
-- get_staff_role() ran as SECURITY INVOKER and SELECTed from profiles. The
-- "admin select profiles" RLS policy qualifier calls get_staff_role() again, so
-- evaluating that policy re-entered get_staff_role() forever, overflowing the
-- Postgres stack -> PostgREST 500 "54001 stack depth limit exceeded" on any
-- client-side write that evaluates the staff policies (e.g.
-- PATCH /rest/v1/rooms {housekeeping_status:'ready'} for "Mark Room Clean").
--
-- Making the function SECURITY DEFINER (with search_path pinned to public) lets
-- its internal read bypass RLS. This is safe: it only ever reads the caller's
-- own row (id = auth.uid()) and EXECUTE was already restricted to authenticated
-- users, so it never broadens what any caller could learn about other rows.

CREATE OR REPLACE FUNCTION public.get_staff_role()
RETURNS staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid() and active = true
$function$;