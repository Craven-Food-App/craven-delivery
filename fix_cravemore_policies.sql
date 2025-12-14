-- Fix: Drop existing policies if they exist, then recreate them
-- Run this if you get "policy already exists" errors

-- RLS Policies for cravemore_plans
DROP POLICY IF EXISTS "Anyone can view active cravemore plans" ON public.cravemore_plans;
CREATE POLICY "Anyone can view active cravemore plans"
  ON public.cravemore_plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage cravemore plans" ON public.cravemore_plans;
CREATE POLICY "Admins can manage cravemore plans"
  ON public.cravemore_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for cravemore_promos
DROP POLICY IF EXISTS "Anyone can view active cravemore promos" ON public.cravemore_promos;
CREATE POLICY "Anyone can view active cravemore promos"
  ON public.cravemore_promos FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage cravemore promos" ON public.cravemore_promos;
CREATE POLICY "Admins can manage cravemore promos"
  ON public.cravemore_promos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for user_memberships
DROP POLICY IF EXISTS "Users can view their own membership" ON public.user_memberships;
CREATE POLICY "Users can view their own membership"
  ON public.user_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own membership" ON public.user_memberships;
CREATE POLICY "Users can create their own membership"
  ON public.user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own membership" ON public.user_memberships;
CREATE POLICY "Users can update their own membership"
  ON public.user_memberships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all memberships" ON public.user_memberships;
CREATE POLICY "Admins can view all memberships"
  ON public.user_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can update memberships" ON public.user_memberships;
CREATE POLICY "System can update memberships"
  ON public.user_memberships FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for membership_entitlements
DROP POLICY IF EXISTS "Users can view their own entitlements" ON public.membership_entitlements;
CREATE POLICY "Users can view their own entitlements"
  ON public.membership_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage entitlements" ON public.membership_entitlements;
CREATE POLICY "System can manage entitlements"
  ON public.membership_entitlements FOR ALL
  TO authenticated
  USING (true);

