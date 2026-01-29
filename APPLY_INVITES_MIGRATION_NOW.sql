-- =====================================================
-- FOUNDATIONAL INVITES MIGRATION
-- Apply this in Supabase SQL Editor NOW
-- =====================================================

-- Create foundational invites table for friends & family support process
-- Amount limits: $50 min / $500 max (5000-50000 cents)

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  relationship_note TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'paid', 'revoked')),
  min_amount_cents INTEGER NOT NULL DEFAULT 5000,
  max_amount_cents INTEGER NOT NULL DEFAULT 50000,
  accepted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_amount_cents INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on access_code for fast lookups
CREATE INDEX IF NOT EXISTS invites_access_code_idx ON public.invites(access_code);
CREATE INDEX IF NOT EXISTS invites_email_idx ON public.invites(email);
CREATE INDEX IF NOT EXISTS invites_status_idx ON public.invites(status);

-- Enforce amount bounds at DB layer
CREATE OR REPLACE FUNCTION public.enforce_invite_amount_bounds()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_amount_cents < 5000 THEN
    NEW.min_amount_cents := 5000;
  END IF;
  IF NEW.max_amount_cents > 50000 THEN
    NEW.max_amount_cents := 50000;
  END IF;
  IF NEW.max_amount_cents < NEW.min_amount_cents THEN
    RAISE EXCEPTION 'max_amount_cents cannot be less than min_amount_cents';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_invite_amount_bounds ON public.invites;
CREATE TRIGGER trg_enforce_invite_amount_bounds
BEFORE INSERT OR UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.enforce_invite_amount_bounds();

-- RLS policies: CEO and admins can manage invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Allow CEO (Torrance) and admin users full access
CREATE POLICY "invites_admin_access" ON public.invites
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- =====================================================
-- DONE - Run this entire script once
-- =====================================================







