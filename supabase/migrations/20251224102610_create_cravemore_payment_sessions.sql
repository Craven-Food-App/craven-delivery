-- Create cravemore_payment_sessions table for Moov payment processing
CREATE TABLE IF NOT EXISTS public.cravemore_payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_key TEXT NOT NULL CHECK (plan_key IN ('monthly', 'annual', 'lifetime')),
  plan_id UUID REFERENCES public.cravemore_plans(id),
  amount_cents INTEGER NOT NULL,
  base_price_cents INTEGER NOT NULL,
  processing_fee_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'canceled')),
  payment_provider TEXT DEFAULT 'moov',
  payment_provider_transaction_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cravemore_payment_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own payment sessions" ON public.cravemore_payment_sessions;
CREATE POLICY "Users can view their own payment sessions"
  ON public.cravemore_payment_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own payment sessions" ON public.cravemore_payment_sessions;
CREATE POLICY "Users can create their own payment sessions"
  ON public.cravemore_payment_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can update payment sessions" ON public.cravemore_payment_sessions;
CREATE POLICY "System can update payment sessions"
  ON public.cravemore_payment_sessions FOR UPDATE
  TO authenticated
  USING (true); -- Edge functions need this

DROP POLICY IF EXISTS "Admins can view all payment sessions" ON public.cravemore_payment_sessions;
CREATE POLICY "Admins can view all payment sessions"
  ON public.cravemore_payment_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cravemore_payment_sessions_user_id ON public.cravemore_payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cravemore_payment_sessions_status ON public.cravemore_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cravemore_payment_sessions_expires_at ON public.cravemore_payment_sessions(expires_at);

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS cravemore_payment_sessions_updated_at ON public.cravemore_payment_sessions;
CREATE TRIGGER cravemore_payment_sessions_updated_at
  BEFORE UPDATE ON public.cravemore_payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_cravemore_updated_at();

-- Comment
COMMENT ON TABLE public.cravemore_payment_sessions IS 'CraveMore payment sessions for Moov payment processing';

