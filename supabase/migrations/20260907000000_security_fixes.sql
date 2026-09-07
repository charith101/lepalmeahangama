-- Security Fixes Migration (2026-09-07)
-- Covers: #1 privilege escalation, #3 RLS tightening, #4 function grants

-- =====================================================================
-- #1  CRITICAL — Privilege escalation at signup
-- Rewrite handle_new_user so role is NEVER read from raw_user_meta_data.
-- Always default to 'receptionist'. Admin-created staff should use the
-- service_role / admin SDK path and set role via raw_app_meta_data or
-- direct INSERT into profiles.
-- =====================================================================
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
    'receptionist'::public.staff_role
  );
  return new;
end;
$function$;

-- =====================================================================
-- #3  HIGH — RLS tightening
-- Tighten policies so only staff (any role) can read internal data.
-- =====================================================================

-- contact_messages: SELECT/UPDATE require staff role (keep public INSERT)
DROP POLICY IF EXISTS "Staff can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Staff can update contact messages" ON public.contact_messages;

CREATE POLICY "Staff can view contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (get_staff_role() IS NOT NULL);

CREATE POLICY "Staff can update contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (get_staff_role() IS NOT NULL)
  WITH CHECK (get_staff_role() IS NOT NULL);

-- shift_notes: SELECT requires staff role
DROP POLICY IF EXISTS "staff_read_notes" ON public.shift_notes;
DROP POLICY IF EXISTS "staff_insert_notes" ON public.shift_notes;

CREATE POLICY "staff_read_notes"
  ON public.shift_notes FOR SELECT
  TO authenticated
  USING (get_staff_role() IS NOT NULL);

CREATE POLICY "staff_insert_notes"
  ON public.shift_notes FOR INSERT
  TO authenticated
  WITH CHECK (get_staff_role() IS NOT NULL);

-- maintenance_requests: SELECT requires staff role
DROP POLICY IF EXISTS "staff_read_maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "staff_insert_maintenance" ON public.maintenance_requests;

CREATE POLICY "staff_read_maintenance"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (get_staff_role() IS NOT NULL);

CREATE POLICY "staff_insert_maintenance"
  ON public.maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (get_staff_role() IS NOT NULL);

-- profiles: SELECT only for staff (not every authenticated user)
DROP POLICY IF EXISTS "read profiles" ON public.profiles;

CREATE POLICY "read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (get_staff_role() IS NOT NULL);

-- rooms: staff_update_housekeeping requires a staff role
DROP POLICY IF EXISTS "staff_update_housekeeping" ON public.rooms;

CREATE POLICY "staff_update_housekeeping"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (get_staff_role() IS NOT NULL)
  WITH CHECK (get_staff_role() IS NOT NULL);

-- =====================================================================
-- #4  HIGH — Revoke function grants
-- =====================================================================

-- global_search: staff only (not anon). Revoke PUBLIC first (anon inherits
-- from PUBLIC), then re-grant to authenticated.
REVOKE EXECUTE ON FUNCTION public.global_search(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.global_search(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.global_search(text) TO authenticated;

-- handle_new_user: revoke from PUBLIC/anon/authenticated (trigger invocation
-- doesn't need explicit grants; SECURITY DEFINER already has elevated access)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- lookup_booking_by_ref: public guest lookup returns a safe subset —
-- drop NIC/passport PII, set search_path, keep the email match requirement.
DROP FUNCTION IF EXISTS public.lookup_booking_by_ref(text, text);

CREATE FUNCTION public.lookup_booking_by_ref(p_ref text, p_email text)
RETURNS TABLE(
  id uuid,
  check_in date,
  check_out date,
  created_at timestamp with time zone,
  group_booking_id uuid,
  notes text,
  num_guests integer,
  ota_name text,
  room_total_usd numeric,
  source text,
  status text,
  guest_full_name text,
  guest_email text,
  guest_phone text,
  guest_nationality text,
  room_number text,
  room_category_name text
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.check_in::date,
    b.check_out::date,
    b.created_at,
    b.group_booking_id,
    b.notes,
    b.num_guests,
    b.ota_name,
    b.room_total_usd,
    b.source::text,
    b.status::text,
    g.full_name,
    g.email,
    g.phone,
    g.nationality,
    r.room_number,
    rc.name
  FROM bookings b
  JOIN guests g ON g.id = b.guest_id
  JOIN rooms r ON r.id = b.room_id
  JOIN room_categories rc ON rc.id = r.category_id
  WHERE (upper(b.group_booking_id::text) LIKE p_ref || '%' OR upper(b.id::text) LIKE p_ref || '%')
    AND lower(g.email) = p_email;
END;
$function$;

-- lookup_booking_by_ref is only reached through the service-role server
-- action, so revoke direct anon/authenticated execution.
REVOKE EXECUTE ON FUNCTION public.lookup_booking_by_ref(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_booking_by_ref(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_booking_by_ref(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_ref(text, text) TO service_role;

-- get_available_equipment_units: SECURITY DEFINER with mutable search_path —
-- pin it. (get_available_rooms already had search_path set.)
CREATE OR REPLACE FUNCTION public.get_available_equipment_units(p_category_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(id uuid, category_id uuid, unit_label text, condition_status equipment_condition_status)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select eu.id, eu.category_id, eu.unit_label, eu.condition_status
  from public.equipment_units eu
  where eu.category_id = p_category_id
    and eu.condition_status = 'good'
    and not exists (
      select 1 from public.equipment_bookings eb
      where eb.unit_id = eu.id
        and eb.status = 'active'
        and daterange(eb.start_date, eb.end_date, '[)') && daterange(p_start_date, p_end_date, '[)')
    )
  order by eu.unit_label;
$function$;

-- global_search: pin mutable search_path (staff-only after the grant fix).
CREATE OR REPLACE FUNCTION public.global_search(p_query text)
RETURNS TABLE(result_type text, id uuid, guest_id uuid, full_name text, email text, phone text, check_in date, check_out date, status text, room_number text, group_booking_id uuid)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  pattern text := '%' || p_query || '%';
begin
  return query
    select
      'guest'::text,
      g.id,
      g.id,
      g.full_name,
      g.email,
      g.phone,
      null::date,
      null::date,
      null::text,
      null::text,
      null::uuid
    from guests g
    where g.full_name ilike pattern
       or g.email ilike pattern
       or g.phone ilike pattern
       or g.nic_or_passport ilike pattern
       or g.nationality ilike pattern
    order by g.full_name
    limit 6;

  return query
    select
      'booking'::text,
      b.id,
      g.id,
      coalesce(g.full_name, 'Guest'),
      g.email,
      g.phone,
      b.check_in,
      b.check_out,
      b.status::text,
      r.room_number,
      b.group_booking_id
    from bookings b
    left join guests g on g.id = b.guest_id
    left join rooms r on r.id = b.room_id
    where upper(b.group_booking_id::text) like upper(p_query) || '%'
       or b.id::text like p_query || '%'
       or coalesce(g.full_name, '') ilike pattern
       or coalesce(g.email, '') ilike pattern
       or coalesce(g.phone, '') ilike pattern
       or coalesce(r.room_number, '') ilike pattern
       or b.status::text ilike pattern
       or coalesce(b.ota_name, '') ilike pattern
       or coalesce(b.notes, '') ilike pattern
    order by b.created_at desc
    limit 8;
end;
$function$;
