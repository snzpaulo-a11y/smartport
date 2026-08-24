-- Add email column to bookings so EmailJS notifications can find the passenger's email.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
