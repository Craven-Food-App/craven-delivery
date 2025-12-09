-- Create driver status and metrics tables
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'busy', 'paused');

-- Create driver profiles table to track ratings and levels
CREATE TABLE public.driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_deliveries integer DEFAULT 0,
  driver_level integer DEFAULT 1,
  status driver_status DEFAULT 'offline',
  is_available boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on driver profiles
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for driver profiles
CREATE POLICY "Drivers can view their own profile" ON public.driver_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own profile" ON public.driver_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Approved feeders can view other driver profiles for assignment" ON public.driver_profiles
FOR SELECT USING (is_approved_craver(auth.uid()));

-- Create order assignments table
CREATE TABLE public.order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  response_time_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on order assignments
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for order assignments
CREATE POLICY "Drivers can view their assignments" ON public.order_assignments
FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their assignments" ON public.order_assignments
FOR UPDATE USING (auth.uid() = driver_id);

CREATE POLICY "Restaurants can view assignments for their orders" ON public.order_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o 
    JOIN restaurants r ON r.id = o.restaurant_id 
    WHERE o.id = order_assignments.order_id AND r.owner_id = auth.uid()
  )
);

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS numeric AS $$
DECLARE
  radius numeric := 3959; -- Earth's radius in miles
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  c := 2 * asin(sqrt(a));
  RETURN radius * c;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_driver_profiles_updated_at
BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_assignments_updated_at
BEFORE UPDATE ON public.order_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample driver profiles for existing approved feeders
INSERT INTO public.driver_profiles (user_id, rating, total_deliveries, driver_level, status, is_available)
SELECT 
  ca.user_id,
  4.2 + (random() * 0.8), -- Rating between 4.2 and 5.0
  floor(random() * 100) + 10, -- 10-110 deliveries
  CASE 
    WHEN random() > 0.7 THEN 3
    WHEN random() > 0.4 THEN 2
    ELSE 1
  END, -- Level 1, 2, or 3
  'offline',
  false
FROM craver_applications ca 
WHERE ca.status = 'approved'
ON CONFLICT (user_id) DO NOTHING;