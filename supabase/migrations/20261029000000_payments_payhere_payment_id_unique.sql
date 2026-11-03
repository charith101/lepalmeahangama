-- PayHere sends notify_url and redirects the guest to return_url seconds
-- apart, and both paths now reconcile through the same confirm helper on the
-- same group. Key the gateway payment id so the loser of that race cannot
-- record (or email) a second charge.
--
-- Partial, mirroring idx_payments_polar_unique: only rows that came from a
-- gateway carry an id, and local cash/bank payments leave it null.
create unique index if not exists idx_payments_payhere_unique
  on public.payments (payhere_payment_id)
  where payhere_payment_id is not null;
