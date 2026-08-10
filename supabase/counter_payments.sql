-- Run this in your Supabase SQL Editor.
-- Adds the "counter" (pay-at-counter / reserved) booking status and the
-- counter_deadline column used to release the seat hold before departure.

-- 1. Drop the old status CHECK constraint (only allowed the 5 legacy statuses).
alter table public.bookings drop constraint if exists bookings_status_check;

-- 2. Re-add it with "counter" included.
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'paid', 'boarded', 'cancelled', 'expired', 'counter'));

-- 3. Column that stores when the counter reservation lapses
--    (set to departure time − 1 hour by the app). Null for non-counter bookings.
alter table public.bookings add column if not exists counter_deadline timestamptz;
