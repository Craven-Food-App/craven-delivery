
-- Fix admin_settings: Replace overly permissive public read policy with admin-only access
DROP POLICY IF EXISTS "Public can view admin settings" ON admin_settings;

-- Only admins can view admin settings
CREATE POLICY "Admins can view admin_settings" ON admin_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can modify admin settings
CREATE POLICY "Admins can modify admin_settings" ON admin_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
