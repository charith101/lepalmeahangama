-- P1: allow admins to insert rooms (no INSERT policy existed; staff could
-- update housekeeping/operational status but never add a room).
create policy "admin insert rooms"
  on public.rooms
  for insert
  to authenticated
  with check (get_staff_role() = 'admin'::staff_role);

-- P1: allow admins to select all profiles (only own-row select existed, so
-- the admin Staff Accounts panel could not list staff).
create policy "admin select profiles"
  on public.profiles
  for select
  to authenticated
  using (get_staff_role() = 'admin'::staff_role);

-- P1: a booking must be able to hold multiple payments (e.g. deposit now,
-- balance at checkout). The UNIQUE(booking_id) index blocked that, and webhook
-- retries are now de-duplicated in code (payhere/notify check-then-insert).
alter table public.payments drop constraint payments_booking_id_key;