-- Add feed preference columns to driver_preferences table
-- These columns allow drivers to customize what orders appear in their feed

ALTER TABLE public.driver_preferences 
ADD COLUMN IF NOT EXISTS max_delivery_distance INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS prefer_short_trips BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS prefer_high_value BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prefer_no_stairs BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefer_apartments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefer_businesses BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avoid_rush_hour BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefer_quick_pickup BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prefer_high_rated_customers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_customer_tips BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prefer_familiar_areas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS batch_deliveries_enabled BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.driver_preferences.max_delivery_distance IS 'Maximum delivery distance in miles';
COMMENT ON COLUMN public.driver_preferences.prefer_short_trips IS 'Prioritize deliveries under 3 miles';
COMMENT ON COLUMN public.driver_preferences.min_order_value IS 'Minimum order value to accept in dollars';
COMMENT ON COLUMN public.driver_preferences.prefer_high_value IS 'Prioritize orders with higher payouts';
COMMENT ON COLUMN public.driver_preferences.prefer_no_stairs IS 'Skip deliveries with stairs';
COMMENT ON COLUMN public.driver_preferences.prefer_apartments IS 'Show apartment deliveries';
COMMENT ON COLUMN public.driver_preferences.prefer_businesses IS 'Show business deliveries';
COMMENT ON COLUMN public.driver_preferences.avoid_rush_hour IS 'Skip peak traffic times';
COMMENT ON COLUMN public.driver_preferences.prefer_quick_pickup IS 'Prefer ready-to-go orders';
COMMENT ON COLUMN public.driver_preferences.prefer_high_rated_customers IS 'Prefer customers with 4+ stars';
COMMENT ON COLUMN public.driver_preferences.show_customer_tips IS 'Display estimated tip amounts';
COMMENT ON COLUMN public.driver_preferences.prefer_familiar_areas IS 'Stay in areas driver knows well';
COMMENT ON COLUMN public.driver_preferences.batch_deliveries_enabled IS 'Accept multiple orders at once';

