-- Create customer orders table to handle real customer orders
CREATE TABLE public.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  order_items JSONB NOT NULL, -- Store cart items as JSON
  subtotal_cents INTEGER NOT NULL,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('delivery', 'pickup')),
  delivery_address TEXT,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  special_instructions TEXT,
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  estimated_pickup_time TIMESTAMP WITH TIME ZONE,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- Allow restaurants to view and manage their orders
CREATE POLICY "Restaurants can view their customer orders" 
ON public.customer_orders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE restaurants.id = customer_orders.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

CREATE POLICY "Restaurants can update their customer orders" 
ON public.customer_orders 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE restaurants.id = customer_orders.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

-- Allow anyone to create customer orders (for guest checkout)
CREATE POLICY "Anyone can create customer orders" 
ON public.customer_orders 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_customer_orders_updated_at
BEFORE UPDATE ON public.customer_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create delivery orders table that links customer orders to feeder deliveries
CREATE TABLE public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_order_id UUID NOT NULL REFERENCES customer_orders(id),
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC NOT NULL,
  pickup_lng NUMERIC NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC NOT NULL,
  dropoff_lng NUMERIC NOT NULL,
  distance_km NUMERIC NOT NULL,
  payout_cents INTEGER NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  assigned_feeder_id UUID,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  pickup_name TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on delivery orders
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Policies for delivery orders (same as existing orders table)
CREATE POLICY "Approved feeders can view pending delivery orders" 
ON public.delivery_orders 
FOR SELECT 
USING (is_approved_feeder(auth.uid()) AND ((status = 'pending'::order_status) OR (assigned_feeder_id = auth.uid())));

CREATE POLICY "Approved feeders can assign themselves to pending delivery orders" 
ON public.delivery_orders 
FOR UPDATE 
USING (is_approved_feeder(auth.uid()) AND (status = 'pending'::order_status) AND (assigned_feeder_id IS NULL))
WITH CHECK (is_approved_feeder(auth.uid()) AND (assigned_feeder_id = auth.uid()) AND (status = 'assigned'::order_status));

CREATE POLICY "Assigned feeders can update their delivery orders" 
ON public.delivery_orders 
FOR UPDATE 
USING (is_approved_feeder(auth.uid()) AND (assigned_feeder_id = auth.uid()));

CREATE POLICY "Restaurants can view their delivery orders" 
ON public.delivery_orders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE restaurants.id = delivery_orders.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

CREATE POLICY "Restaurants can create delivery orders for their restaurant" 
ON public.delivery_orders 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE restaurants.id = delivery_orders.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_delivery_orders_updated_at
BEFORE UPDATE ON public.delivery_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();