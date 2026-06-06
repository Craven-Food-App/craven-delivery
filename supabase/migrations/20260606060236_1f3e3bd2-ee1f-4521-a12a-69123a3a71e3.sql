-- 1. Add feeder_route_started_at column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS feeder_route_started_at timestamptz NULL;

-- 2. Function to generate a 6-digit numeric pickup code
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lpad((floor(random() * 1000000))::int::text, 6, '0');
END;
$$;

-- 3. Trigger to auto-populate pickup_code when missing or invalid
CREATE OR REPLACE FUNCTION public.ensure_order_pickup_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pickup_code IS NULL OR NEW.pickup_code !~ '^[0-9]{6}$' THEN
    NEW.pickup_code := public.generate_pickup_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_ensure_pickup_code ON public.orders;
CREATE TRIGGER trg_orders_ensure_pickup_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_order_pickup_code();

-- 4. Backfill: regenerate any pickup_code that's null or not exactly 6 digits
UPDATE public.orders
SET pickup_code = public.generate_pickup_code()
WHERE pickup_code IS NULL OR pickup_code !~ '^[0-9]{6}$';
