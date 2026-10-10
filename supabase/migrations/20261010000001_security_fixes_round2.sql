-- Security Fixes — Round 2 (2026-10-10)
-- Closes the remaining Batch 5 findings after round 1:
--
--   * handle_new_user defaulted self-signups to 'receptionist' — the full
--     staff PII surface (bookings/guests/payments/invoices/booking_charges
--     are RLS-visible to non-housekeeping staff). The app has no in-app
--     staff-creation path; staff are provisioned via the admin SDK/dashboard
--     with an explicit role, so any self-registration should land in the
--     least-privileged non-PII role: housekeeping.
--
--   * get_staff_role() ignored profiles.active. A deactivated staff member's
--     access token kept its RLS privileges until someone revoked auth. Now the
--     role only resolves for active profiles, so deactivation (profiles.active
--     = false) revokes RLS access immediately (checklist AC-09).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Staff'),
    'housekeeping'::public.staff_role
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_staff_role()
RETURNS staff_role
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid() and active = true
$function$;