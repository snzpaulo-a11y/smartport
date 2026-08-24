-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query → Run)
-- This enables direct password reset after OTP verification, no email link needed.

CREATE OR REPLACE FUNCTION public.reset_user_password(
  p_email text,
  p_code text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id uuid;
  v_stored_code text;
  v_code_expires_at timestamptz;
BEGIN
  -- Find the user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check OTP from our recovery_codes table (if it exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recovery_codes') THEN
    SELECT code, expires_at INTO v_stored_code, v_code_expires_at
    FROM recovery_codes
    WHERE user_id = v_user_id
      AND used = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_stored_code IS NULL OR v_stored_code != p_code THEN
      RAISE EXCEPTION 'Invalid recovery code';
    END IF;

    IF v_code_expires_at < now() THEN
      RAISE EXCEPTION 'Recovery code expired';
    END IF;

    -- Mark code as used
    UPDATE recovery_codes SET used = true WHERE user_id = v_user_id AND code = v_stored_code;
  END IF;

  -- Update the password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Allow anonymous callers to invoke this function
GRANT EXECUTE ON FUNCTION public.reset_user_password(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_user_password(text, text, text) TO authenticated;
