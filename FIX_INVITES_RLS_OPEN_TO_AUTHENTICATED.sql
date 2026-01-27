-- Fix RLS for foundational invites so Hub can manage invites via Supabase client
-- This opens the invites table to any authenticated user (browser session),
-- while still keeping CEO/admin-specific policy in place.

-- Run this in Supabase SQL editor.

-- Enable RLS (if not already enabled)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access to invites from the browser
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invites'
      AND policyname = 'invites_authenticated_access'
  ) THEN
    CREATE POLICY "invites_authenticated_access" ON public.invites
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;






