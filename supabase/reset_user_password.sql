-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Creates the function that the account-recovery flow uses to update the password
-- with a properly bcrypt-hashed value, so supabase.auth.signInWithPassword accepts it.

create or replace function public.reset_user_password(
  user_email text,
  new_password text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  select id into v_uid
  from auth.users
  where email = lower(trim(user_email));

  if v_uid is null then
    return false;
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = v_uid;

  return true;
end;
$$;

-- Allow the anon key to call it
grant execute on function public.reset_user_password(text, text) to anon, authenticated;
