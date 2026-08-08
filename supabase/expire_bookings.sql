-- Run this in your Supabase SQL Editor.
-- The bookings table has a CHECK constraint that only allowed
-- pending/paid/boarded/cancelled. We relax it so the 3-hour expiry
-- feature can write status = 'expired' (frees the seat + shows in UI).

alter table public.bookings drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'paid', 'boarded', 'cancelled', 'expired'));
