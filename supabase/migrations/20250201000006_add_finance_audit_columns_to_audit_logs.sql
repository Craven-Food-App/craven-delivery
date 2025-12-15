-- Add finance audit system columns to existing audit_logs table
-- This migration adds all required columns for the finance audit system

DO $$
BEGIN
  -- Add all finance audit columns if they don't exist
  ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS transaction_type TEXT,
    ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS entered_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS cleared_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS flag_reason TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'low',
    ADD COLUMN IF NOT EXISTS has_documentation BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS documentation_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS account_category TEXT,
    ADD COLUMN IF NOT EXISTS expense_category TEXT,
    ADD COLUMN IF NOT EXISTS linked_vendor_id UUID,
    ADD COLUMN IF NOT EXISTS linked_driver_id UUID,
    ADD COLUMN IF NOT EXISTS linked_merchant_id UUID,
    ADD COLUMN IF NOT EXISTS linked_customer_id UUID,
    ADD COLUMN IF NOT EXISTS linked_order_id UUID,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS cfo_comment TEXT,
    ADD COLUMN IF NOT EXISTS ip_address INET,
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS device_info JSONB,
    ADD COLUMN IF NOT EXISTS geo_location JSONB,
    ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS anomaly_detected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

  -- Add constraints if they don't exist
  -- Note: We can't easily check for constraints, so we'll use IF NOT EXISTS where possible
  -- For CHECK constraints, we'll need to handle them separately if needed
  
  -- Set default values for existing rows
  UPDATE public.audit_logs 
  SET 
    transaction_date = COALESCE(transaction_date, CURRENT_DATE),
    entered_date = COALESCE(entered_date, created_at, now()),
    amount = COALESCE(amount, 0),
    currency = COALESCE(currency, 'USD'),
    status = COALESCE(status, 'pending'),
    severity = COALESCE(severity, 'low'),
    has_documentation = COALESCE(has_documentation, false),
    documentation_count = COALESCE(documentation_count, 0),
    risk_score = COALESCE(risk_score, 0),
    anomaly_detected = COALESCE(anomaly_detected, false),
    audit_trail = COALESCE(audit_trail, '[]'::jsonb),
    updated_at = COALESCE(updated_at, created_at, now())
  WHERE transaction_date IS NULL 
     OR entered_date IS NULL 
     OR amount IS NULL
     OR status IS NULL;

  -- Migrate user_id to entered_by if needed
  UPDATE public.audit_logs 
  SET entered_by = user_id 
  WHERE entered_by IS NULL 
    AND user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs' 
      AND column_name = 'user_id'
    );

EXCEPTION
  WHEN duplicate_column THEN
    -- Column already exists, continue
    NULL;
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Create indexes (will fail gracefully if they already exist)
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_date ON public.audit_logs(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entered_by ON public.audit_logs(entered_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_reviewed_by ON public.audit_logs(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON public.audit_logs(source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_anomaly ON public.audit_logs(anomaly_detected) WHERE anomaly_detected = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_id ON public.audit_logs(transaction_id) WHERE transaction_id IS NOT NULL;

-- Add unique constraint on transaction_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_logs_transaction_id_unique'
  ) THEN
    ALTER TABLE public.audit_logs 
    ADD CONSTRAINT audit_logs_transaction_id_unique UNIQUE (transaction_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

