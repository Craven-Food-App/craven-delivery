-- Migration: Add Stripe payment method support
-- This migration adds Stripe-specific columns to support the migration from Moov to Stripe

-- Add Stripe payment method ID column to payment_methods table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_methods' 
        AND column_name = 'stripe_payment_method_id'
    ) THEN
        ALTER TABLE public.payment_methods 
        ADD COLUMN stripe_payment_method_id TEXT;
    END IF;

    -- Add stripe_customer_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_methods' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.payment_methods 
        ADD COLUMN stripe_customer_id TEXT;
    END IF;

    -- Update provider default to 'stripe' if column exists and default is different
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_methods' 
        AND column_name = 'provider'
    ) THEN
        -- Update existing rows with 'moov' provider to 'stripe' (optional - comment out if you want to keep both)
        -- UPDATE public.payment_methods SET provider = 'stripe' WHERE provider = 'moov';
        
        -- Set default to 'stripe' for new rows
        ALTER TABLE public.payment_methods 
        ALTER COLUMN provider SET DEFAULT 'stripe';
    END IF;
END $$;

-- Add Stripe customer ID to user_profiles for easier customer management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_payment_method_id 
    ON public.payment_methods(stripe_payment_method_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer_id 
    ON public.payment_methods(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id 
    ON public.user_profiles(stripe_customer_id);

-- Add payment intent tracking to orders table (if orders table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
    ) THEN
        -- Add payment_intent_id if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'payment_intent_id'
        ) THEN
            ALTER TABLE public.orders 
            ADD COLUMN payment_intent_id TEXT;
        END IF;

        -- Add payment_status if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'payment_status'
        ) THEN
            ALTER TABLE public.orders 
            ADD COLUMN payment_status TEXT;
        END IF;

        -- Add payment_provider if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'payment_provider'
        ) THEN
            ALTER TABLE public.orders 
            ADD COLUMN payment_provider TEXT DEFAULT 'stripe';
        END IF;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id 
            ON public.orders(payment_intent_id);
        
        CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
            ON public.orders(payment_status);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.payment_methods.stripe_payment_method_id IS 'Stripe payment method ID (e.g., pm_1234567890)';
COMMENT ON COLUMN public.payment_methods.stripe_customer_id IS 'Stripe customer ID associated with this payment method';
COMMENT ON COLUMN public.user_profiles.stripe_customer_id IS 'Stripe customer ID for this user';
COMMENT ON COLUMN public.orders.payment_intent_id IS 'Stripe payment intent ID (e.g., pi_1234567890)';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment status: succeeded, pending, failed, etc.';
COMMENT ON COLUMN public.orders.payment_provider IS 'Payment provider: stripe, moov, etc.';


























