-- Merchant app login: return merchant account ID prefix (all but last 4 chars) for a given email.
-- Each merchant has one unique Merchant ID (merchant_accounts.merchant_id) for all their stores.
-- Callable by anon so the tablet app can show the prefix before sign-in.

CREATE OR REPLACE FUNCTION public.get_merchant_id_prefix_by_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_merchant_id TEXT;
BEGIN
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ma.merchant_id INTO v_merchant_id
  FROM public.merchant_accounts ma
  WHERE ma.user_id = v_user_id
  LIMIT 1;

  IF v_merchant_id IS NULL THEN
    v_merchant_id := public.ensure_merchant_account(v_user_id);
  END IF;

  IF v_merchant_id IS NULL OR LENGTH(v_merchant_id) < 4 THEN
    RETURN NULL;
  END IF;

  RETURN LEFT(v_merchant_id, LENGTH(v_merchant_id) - 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_merchant_id_prefix_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_merchant_id_prefix_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_merchant_id_prefix_by_email(TEXT) IS
  'Returns the merchant account ID prefix for login screen; last 4 chars are entered by user. Callable by anon for tablet merchant app.';
