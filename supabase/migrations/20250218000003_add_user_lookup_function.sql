-- Function to look up user_id by email for Intern Program Admin
-- This is a simplified version that checks auth.users directly (where all authenticated users exist)
-- No role restrictions - Intern Program Admins need to assign roles to any user

-- Create a new function with a different name to avoid conflicts
CREATE OR REPLACE FUNCTION public.lookup_user_for_intern_role(p_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  found_in TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_found_in TEXT;
  v_email TEXT;
BEGIN
  -- Normalize email
  v_email := LOWER(TRIM(p_email));
  
  -- First try employees table (has email column and user_id)
  SELECT e.user_id, e.email, 'employees'::TEXT
  INTO v_user_id, v_found_in
  FROM public.employees e
  WHERE LOWER(TRIM(e.email)) = v_email
    AND e.user_id IS NOT NULL
  LIMIT 1;

  -- If not found in employees, check auth.users directly (all authenticated users are here)
  -- This is the authoritative source - if someone can log in, they're in auth.users
  IF v_user_id IS NULL THEN
    SELECT u.id, u.email, 'auth.users'::TEXT
    INTO v_user_id, v_found_in
    FROM auth.users u
    WHERE LOWER(TRIM(u.email)) = v_email
    LIMIT 1;
  END IF;

  -- Return result
  IF v_user_id IS NOT NULL THEN
    -- Get email from auth.users to ensure we have the correct one
    SELECT COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), p_email) INTO v_email;
    RETURN QUERY SELECT v_user_id, v_email, v_found_in;
  ELSE
    RETURN; -- Return empty result
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Grant execute permission to authenticated users (Intern Program Admins are authenticated)
GRANT EXECUTE ON FUNCTION public.lookup_user_for_intern_role(TEXT) TO authenticated;

COMMENT ON FUNCTION public.lookup_user_for_intern_role(TEXT) IS 'Looks up user_id by email for Intern Program Admin role assignments. Checks employees table first, then auth.users (authoritative source for all authenticated users).';

