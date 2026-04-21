CREATE OR REPLACE FUNCTION public.get_partnership_request_requesters(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.email, up.full_name
  FROM public.user_profiles up
  WHERE up.user_id = ANY(_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_partnership_request_requesters(uuid[]) TO authenticated;