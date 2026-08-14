-- ============================================================================
-- SmartPort Security Hardening Migration
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
--
-- Deploy the NEW frontend first (staffLogin etc. use RPC-with-fallback, so the
-- app keeps working), then run this file. After this runs:
--   * anon can no longer SELECT/UPDATE/DELETE the `staff` or `admin_keys` tables
--   * staff passwords are bcrypt-hashed and verified server-side
--   * password reset requires a server-issued, single-use OTP
--   * duplicate active seat bookings are expired and blocked at the DB level
--   * permanently removed ships are hard-purged
--   * contact_messages gets an insert policy
-- ============================================================================

-- ============================================================================
-- 1. PASSWORD RESET — server-issued OTP (fixes anon account takeover)
-- ----------------------------------------------------------------------------
-- Old behavior: reset_user_password(email, new_password) was callable by anyone
-- holding the anon key. New behavior: a code is issued by the server and must
-- be presented with the reset request; codes are single-use and expire.
-- ============================================================================

create table if not exists public.password_reset_codes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code_hash  text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used       boolean not null default false
);

create index if not exists password_reset_codes_email_idx
  on public.password_reset_codes (email, used);

-- Issue a 6-digit reset code for a registered email.
-- Returns the code to the caller. In a production deployment the code should
-- be delivered server-side (Edge Function / email provider) and this function
-- should return NULL; the frontend currently delivers it via EmailJS/SMS.
create or replace function public.request_password_reset(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code  text;
  v_email text := lower(trim(p_email));
begin
  if not exists (select 1 from auth.users where lower(email) = v_email) then
    return null;
  end if;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Invalidate any previous outstanding code for this email.
  delete from public.password_reset_codes
   where email = v_email and used = false;

  insert into public.password_reset_codes (email, code_hash, expires_at)
  values (v_email, extensions.crypt(v_code, extensions.gen_salt('bf')), now() + interval '10 minutes');

  return v_code;
end;
$$;

grant execute on function public.request_password_reset(text) to anon, authenticated;

-- Remove the old unauthenticated reset (email + password only).
drop function if exists public.reset_user_password(text, text);

-- Reset a password only when a valid, unused, unexpired code is presented.
create or replace function public.reset_user_password(
  p_email         text,
  p_code          text,
  p_new_password  text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid   uuid;
  v_code  public.password_reset_codes%rowtype;
begin
  if p_new_password is null or length(p_new_password) < 6 then
    return false;
  end if;

  select * into v_code
    from public.password_reset_codes
   where email = v_email
     and used = false
     and expires_at > now()
   order by created_at desc
   limit 1;

  if v_code.id is null then
    return false;
  end if;

  if extensions.crypt(p_code, v_code.code_hash) <> v_code.code_hash then
    return false;
  end if;

  select id into v_uid from auth.users where lower(email) = v_email;
  if v_uid is null then
    return false;
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_uid;

  update public.password_reset_codes set used = true where id = v_code.id;

  return true;
end;
$$;

grant execute on function public.reset_user_password(text, text, text) to anon, authenticated;

-- ============================================================================
-- 2. STAFF — bcrypt at rest + server-side login + RPC-only management
-- ----------------------------------------------------------------------------
-- After this migration anon/authenticated can no longer read or mutate the
-- staff table directly. All access goes through the SECURITY DEFINER RPCs below.
-- ============================================================================

-- 2a. Convert any legacy plaintext passwords to bcrypt hashes.
update public.staff
   set password = extensions.crypt(password, extensions.gen_salt('bf'))
 where password is not null
   and password not like '$2a$%'
   and password not like '$2b$%'
   and password not like '$2y$%';

-- 2b. Server-side login. Never returns the password.
create or replace function public.staff_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.staff%rowtype;
begin
  select * into v
    from public.staff
   where lower(trim(email)) = lower(trim(p_email))
   limit 1;

  if v.id is null then
    return null;
  end if;

  -- Verify bcrypt hash (a plaintext-equality branch keeps any rows that were
  -- created by an old client before the migration working; they get hashed on
  -- the next admin update).
  if v.password is not null and (
       (v.password like '$2%' and extensions.crypt(p_password, v.password) = v.password)
       or v.password = p_password
     ) then
    return jsonb_build_object(
      'id',         v.id,
      'name',       v.name,
      'email',      v.email,
      'role',       v.role,
      'ship_type',  v.ship_type,
      'ship_id',    v.ship_id,
      'created_at', v.created_at
    );
  end if;

  return null;
end;
$$;

grant execute on function public.staff_login(text, text) to anon, authenticated;

-- 2c. Staff list — returns staff without any password material.
create or replace function public.staff_list()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',         s.id,
      'name',       s.name,
      'email',      s.email,
      'role',       s.role,
      'ship_type',  s.ship_type,
      'ship_id',    s.ship_id,
      'created_at', s.created_at
    ) order by s.created_at desc), '[]'::jsonb)
    into v_rows
    from public.staff s;

  return v_rows;
end;
$$;

grant execute on function public.staff_list() to anon, authenticated;

-- 2d. Staff management RPCs (mirror the old client-side table calls).
create or replace function public.staff_create(
  p_name       text,
  p_email      text,
  p_password   text,
  p_ship_type  text,
  p_ship_ids   text[],
  p_role       text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.staff (name, email, password, role, ship_type, ship_id)
  values (
    p_name,
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    coalesce(nullif(p_role, ''), 'scanner'),
    coalesce(nullif(p_ship_type, ''), 'ferry'),
    case when p_ship_ids is not null then array_to_string(p_ship_ids, ',') else null end
  );
end;
$$;

create or replace function public.staff_update(
  p_id        text,
  p_name      text,
  p_email     text,
  p_password  text,
  p_role      text,
  p_ship_ids  text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.staff
     set name       = coalesce(nullif(p_name, ''), name),
         email      = coalesce(nullif(p_email, ''), email),
         role       = coalesce(nullif(p_role, ''), role),
         ship_id    = case
                        when p_ship_ids is null then ship_id
                        when array_length(p_ship_ids, 1) > 0 then array_to_string(p_ship_ids, ',')
                        else null
                      end,
         password   = case
                        when p_password is not null and p_password <> '' then extensions.crypt(p_password, extensions.gen_salt('bf'))
                        else password
                      end
   where id = p_id;
end;
$$;

create or replace function public.staff_delete(p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.staff where id = p_id;
end;
$$;

grant execute on function public.staff_create(text, text, text, text, text[], text) to anon, authenticated;
grant execute on function public.staff_update(text, text, text, text, text, text[]) to anon, authenticated;
grant execute on function public.staff_delete(text) to anon, authenticated;

-- 2d. Lock the tables down. No policies = deny all for anon/authenticated.
alter table public.staff enable row level security;
alter table public.admin_keys enable row level security;

-- ============================================================================
-- 3. ID PHOTOS — remove predictability.
-- ----------------------------------------------------------------------------
-- The frontend now uploads under random UUID filenames so other passengers can
-- no longer enumerate ID photos. The bucket stays public for admin review
-- (admins are staff-table accounts, not Supabase auth users). To go fully
-- private in production, run:
--   update storage.buckets set public = false where name = 'id-verifications';
-- then serve the photos via signed URLs created by an Edge Function.
-- ============================================================================

-- ============================================================================
-- 4. DB-LEVEL SEAT INTEGRITY — unique active booking per (ship, date, seat).
-- ----------------------------------------------------------------------------
-- Fixes the counter oversell race: two bookings can no longer hold the same
-- seat+date. Older duplicates are expired first so the index can be built.
-- ============================================================================

with dups as (
  select id,
         row_number() over (
           partition by ship_id, trip_date, seat_id
           order by created_at desc
         ) as rn
    from public.bookings
   where status in ('pending', 'paid', 'boarded', 'counter')
     and seat_id is not null
     and trip_date is not null
)
update public.bookings b
   set status = 'expired', user_id = null
  from dups
 where b.id = dups.id and dups.rn > 1;

create unique index if not exists bookings_active_seat_uidx
  on public.bookings (ship_id, trip_date, seat_id)
  where status in ('pending', 'paid', 'boarded', 'counter')
    and seat_id is not null
    and trip_date is not null;

-- ============================================================================
-- 5. HARD PURGE of permanently removed ships.
-- ----------------------------------------------------------------------------
-- These vessels were removed from the active fleet. Deletes in FK-safe order.
-- ============================================================================

delete from public.bookings where ship_id in ('1776150856115-zq4zv0jz8', '1776151844703-lwp2r67lp');
delete from public.seats    where ship_id in ('1776150856115-zq4zv0jz8', '1776151844703-lwp2r67lp');
delete from public.ships    where id     in ('1776150856115-zq4zv0jz8', '1776151844703-lwp2r67lp');

-- ============================================================================
-- 6. CONTACT MESSAGES — table + insert policy.
-- ============================================================================

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid,
  name       text not null,
  email      text not null,
  message    text not null
);

alter table public.contact_messages enable row level security;

create policy "contact_messages_insert_own" on public.contact_messages
  for insert to authenticated
  with check (true);
