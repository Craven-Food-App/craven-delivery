-- Enhanced authentication and account management tables

-- Add user profiles table for better account management
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT CHECK(role IN ('customer', 'driver', 'admin', 'restaurant_owner')) NOT NULL DEFAULT 'customer',
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- User can view and update their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.user_profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'stripe',
    stripe_payment_method_id TEXT,
    last4 TEXT,
    brand TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- User can manage their own payment methods
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'payment_methods' 
        AND policyname = 'Users can manage own payment methods'
    ) THEN
        CREATE POLICY "Users can manage own payment methods" ON public.payment_methods
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Delivery addresses table
CREATE TABLE IF NOT EXISTS public.delivery_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

-- User can manage their own addresses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'delivery_addresses' 
        AND policyname = 'Users can manage own addresses'
    ) THEN
        CREATE POLICY "Users can manage own addresses" ON public.delivery_addresses
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Driver earnings table
CREATE TABLE IF NOT EXISTS public.driver_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES customer_orders(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL,
    tip_cents INTEGER DEFAULT 0,
    total_cents INTEGER GENERATED ALWAYS AS (amount_cents + tip_cents) STORED,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    paid_out_at TIMESTAMP WITH TIME ZONE,
    payout_method TEXT DEFAULT 'bank_transfer'
);

-- Enable RLS
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own earnings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'driver_earnings' 
        AND policyname = 'Drivers can view own earnings'
    ) THEN
        CREATE POLICY "Drivers can view own earnings" ON public.driver_earnings
            FOR SELECT USING (auth.uid() = driver_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'driver_earnings' 
        AND policyname = 'System can insert earnings'
    ) THEN
        CREATE POLICY "System can insert earnings" ON public.driver_earnings
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Customer feedback table
CREATE TABLE IF NOT EXISTS public.order_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_rating INTEGER CHECK(restaurant_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK(driver_rating BETWEEN 1 AND 5),
    food_quality_rating INTEGER CHECK(food_quality_rating BETWEEN 1 AND 5),
    delivery_time_rating INTEGER CHECK(delivery_time_rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- Customers can create feedback for their orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'order_feedback' 
        AND policyname = 'Customers can create own feedback'
    ) THEN
        CREATE POLICY "Customers can create own feedback" ON public.order_feedback
            FOR INSERT WITH CHECK (auth.uid() = customer_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'order_feedback' 
        AND policyname = 'Users can view related feedback'
    ) THEN
        CREATE POLICY "Users can view related feedback" ON public.order_feedback
            FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = driver_id);
    END IF;
END $$;

-- Add triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_payment_methods_updated_at'
    ) THEN
        CREATE TRIGGER update_payment_methods_updated_at
            BEFORE UPDATE ON public.payment_methods
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_delivery_addresses_updated_at'
    ) THEN
        CREATE TRIGGER update_delivery_addresses_updated_at
            BEFORE UPDATE ON public.delivery_addresses
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Enable realtime for account management tables
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.payment_methods REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_addresses REPLICA IDENTITY FULL;
ALTER TABLE public.driver_earnings REPLICA IDENTITY FULL;
ALTER TABLE public.order_feedback REPLICA IDENTITY FULL;

-- Add tables to realtime publication (idempotent)
DO $$
DECLARE
    tbl_name TEXT;
    schema_name TEXT;
    table_only_name TEXT;
    tables_to_add TEXT[] := ARRAY[
        'public.user_profiles',
        'public.payment_methods',
        'public.delivery_addresses',
        'public.driver_earnings',
        'public.order_feedback'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_add
    LOOP
        -- Parse schema and table name
        schema_name := split_part(tbl_name, '.', 1);
        table_only_name := split_part(tbl_name, '.', 2);
        
        -- First check if the table exists
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables t
            WHERE t.table_schema = schema_name
            AND t.table_name = table_only_name
        ) THEN
            -- Check if table is already in the publication
            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables p
                WHERE p.pubname = 'supabase_realtime'
                AND p.schemaname = schema_name
                AND p.tablename = table_only_name
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', schema_name, table_only_name);
            END IF;
        END IF;
    END LOOP;
END $$;