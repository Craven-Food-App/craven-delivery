-- Allow deleting company (internal) announcements: author or privileged roles.

DROP POLICY IF EXISTS "Authors or admins can delete announcements" ON public.internal_announcements;

CREATE POLICY "Authors or admins can delete announcements"
  ON public.internal_announcements
  FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN (
          'admin',
          'CRAVEN_FOUNDER',
          'CRAVEN_CEO',
          'CRAVEN_CORPORATE_SECRETARY'
        )
    )
  );
