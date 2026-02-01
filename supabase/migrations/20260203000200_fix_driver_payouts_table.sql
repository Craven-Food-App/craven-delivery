-- ============================================
-- Fix driver_payouts table issues
-- ============================================

-- Check if table exists and recreate if needed
DO $$
BEGIN
  -- Check if driver_payouts table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_payouts') THEN
    RAISE NOTICE 'driver_payouts table does not exist, creating...';
    
    -- Create the table
    CREATE TABLE public.driver_payouts (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      batch_id UUID REFERENCES public.daily_payout_batches(id) ON DELETE SET NULL,
      driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      payment_method_id UUID REFERENCES public.driver_payment_methods(id) ON DELETE SET NULL,
      amount DECIMAL(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'failed')),
      external_transaction_id TEXT,
      error_message TEXT,
      processed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Create indexes
    CREATE INDEX idx_driver_payouts_driver_id ON public.driver_payouts(driver_id);
    CREATE INDEX idx_driver_payouts_batch_id ON public.driver_payouts(batch_id);
    CREATE INDEX idx_driver_payouts_status ON public.driver_payouts(status);
    CREATE INDEX idx_driver_payouts_created_at ON public.driver_payouts(created_at DESC);
    
    -- Enable RLS
    ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Drivers can view their own payouts" 
      ON public.driver_payouts 
      FOR SELECT 
      USING (auth.uid() = driver_id);
    
    CREATE POLICY "Admins can manage all payouts" 
      ON public.driver_payouts 
      FOR ALL 
      USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ));
      
    RAISE NOTICE 'driver_payouts table created successfully';
  ELSE
    RAISE NOTICE 'driver_payouts table already exists';
    
    -- Ensure the table has the correct structure
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'driver_payouts' 
                   AND column_name = 'amount') THEN
      ALTER TABLE public.driver_payouts ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'driver_payouts' 
                   AND column_name = 'status') THEN
      ALTER TABLE public.driver_payouts ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
    
    -- Ensure RLS is enabled
    ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;
    
    -- Recreate policies (drop if exist, then create)
    DROP POLICY IF EXISTS "Drivers can view their own payouts" ON public.driver_payouts;
    CREATE POLICY "Drivers can view their own payouts" 
      ON public.driver_payouts 
      FOR SELECT 
      USING (auth.uid() = driver_id);
    
    DROP POLICY IF EXISTS "Admins can manage all payouts" ON public.driver_payouts;
    CREATE POLICY "Admins can manage all payouts" 
      ON public.driver_payouts 
      FOR ALL 
      USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ));
    
    RAISE NOTICE 'driver_payouts table structure verified';
  END IF;
END $$;

-- Create daily_payout_batches if it doesn't exist (referenced by driver_payouts)
CREATE TABLE IF NOT EXISTS public.daily_payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL UNIQUE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for daily_payout_batches
ALTER TABLE public.daily_payout_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for payout batches
DROP POLICY IF EXISTS "Admins can manage payout batches" ON public.daily_payout_batches;
CREATE POLICY "Admins can manage payout batches" 
  ON public.daily_payout_batches 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Create driver_payment_methods if it doesn't exist (referenced by driver_payouts)
CREATE TABLE IF NOT EXISTS public.driver_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('bank_account', 'debit_card', 'paypal')),
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  last_four TEXT,
  bank_name TEXT,
  account_holder_name TEXT,
  stripe_payment_method_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for driver_payment_methods
ALTER TABLE public.driver_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can manage their own payment methods" ON public.driver_payment_methods;
CREATE POLICY "Drivers can manage their own payment methods" 
  ON public.driver_payment_methods 
  FOR ALL 
  USING (auth.uid() = driver_id);

-- Success
SELECT 'driver_payouts table fix completed' as status;

