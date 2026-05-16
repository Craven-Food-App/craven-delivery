
-- 1. ceo_access_credentials: enable RLS, deny all client access (service role bypasses RLS)
ALTER TABLE public.ceo_access_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.ceo_access_credentials;
CREATE POLICY "Deny all client access to ceo credentials"
ON public.ceo_access_credentials
AS RESTRICTIVE
FOR ALL
TO public, authenticated, anon
USING (false)
WITH CHECK (false);

-- 2. user_profiles: remove unconditional public SELECT
DROP POLICY IF EXISTS "Admins can view user profiles" ON public.user_profiles;

-- 3. gmail_messages / gmail_sync_state: restrict to delegated user (by email) or admin
DROP POLICY IF EXISTS "Authenticated users can view Gmail messages" ON public.gmail_messages;
CREATE POLICY "Delegated user or admin can view gmail messages"
ON public.gmail_messages
FOR SELECT
TO authenticated
USING (
  public.is_user_admin(auth.uid())
  OR delegated_user = (SELECT email FROM auth.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can view sync state" ON public.gmail_sync_state;
CREATE POLICY "Delegated user or admin can view gmail sync state"
ON public.gmail_sync_state
FOR SELECT
TO authenticated
USING (
  public.is_user_admin(auth.uid())
  OR delegated_user = (SELECT email FROM auth.users WHERE id = auth.uid())
);
