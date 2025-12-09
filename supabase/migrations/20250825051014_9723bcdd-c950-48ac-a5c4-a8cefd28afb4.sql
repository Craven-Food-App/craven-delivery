-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'assigned', 'picked_up', 'delivered', 'cancelled');

-- Create orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    pickup_name TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat NUMERIC NOT NULL,
    pickup_lng NUMERIC NOT NULL,
    dropoff_name TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat NUMERIC NOT NULL,
    dropoff_lng NUMERIC NOT NULL,
    payout_cents INTEGER NOT NULL,
    distance_km NUMERIC NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    assigned_feeder_id UUID NULL
);

-- Create feeder_locations table
CREATE TABLE public.feeder_locations (
    user_id UUID NOT NULL PRIMARY KEY,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeder_locations ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is approved feeder
CREATE OR REPLACE FUNCTION public.is_approved_feeder(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.feeder_applications 
        WHERE user_id = user_uuid AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Orders RLS policies
CREATE POLICY "Approved feeders can view pending orders" 
ON public.orders 
FOR SELECT 
USING (
    public.is_approved_feeder(auth.uid()) AND 
    (status = 'pending' OR assigned_feeder_id = auth.uid())
);

CREATE POLICY "Assigned feeders can update their orders" 
ON public.orders 
FOR UPDATE 
USING (
    public.is_approved_feeder(auth.uid()) AND 
    assigned_feeder_id = auth.uid()
);

-- Feeder locations RLS policies
CREATE POLICY "Feeders can manage their own location" 
ON public.feeder_locations 
FOR ALL 
USING (user_id = auth.uid());

-- Add update trigger for orders
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for feeder_locations
CREATE TRIGGER update_feeder_locations_updated_at
    BEFORE UPDATE ON public.feeder_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.feeder_locations REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.orders;
ALTER publication supabase_realtime ADD TABLE public.feeder_locations;

-- Insert demo orders
INSERT INTO public.orders (pickup_name, pickup_address, pickup_lat, pickup_lng, dropoff_name, dropoff_address, dropoff_lat, dropoff_lng, payout_cents, distance_km) VALUES
('McDonald''s Downtown', '123 Main St, San Francisco, CA', 37.7749, -122.4194, 'John''s Apartment', '456 Oak St, San Francisco, CA', 37.7849, -122.4094, 850, 2.3),
('Starbucks Union Square', '789 Powell St, San Francisco, CA', 37.7880, -122.4074, 'Sarah''s Office', '321 Pine St, San Francisco, CA', 37.7919, -122.4057, 650, 1.2),
('Pizza Palace', '555 Market St, San Francisco, CA', 37.7898, -122.3942, 'Mike''s House', '888 Folsom St, San Francisco, CA', 37.7852, -122.3971, 1200, 3.1);