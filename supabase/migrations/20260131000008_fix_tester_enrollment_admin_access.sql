-- Fix admin access to android_tester_enrollments for testing portal
-- Update RLS policies to allow admins via user_profiles.role

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.android_tester_enrollments;

-- Create updated admin policy that checks user_profiles.role
CREATE POLICY "Admins can view all enrollments"
ON public.android_tester_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

-- Also allow admins to update via user_profiles
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.android_tester_enrollments;

CREATE POLICY "Admins can update enrollments"
ON public.android_tester_enrollments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

